import json
import logging
from collections import defaultdict
from decimal import Decimal

import httpx
from sqlalchemy.orm import Session

from ..budgets.models import Budget
from ..budgets.service import compute_actual
from ..categories.models import Category
from ..core.config import settings
from ..transactions.models import Transaction

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "/no_think\n"
    "You are FinHealth AI, a friendly financial advisor chatbot."
    "\n\nRules:"
    "\n- Be concise. Use bullet points for multiple items."
    "\n- Reference specific numbers from their data."
    "\n- Use Indian Rupee (\u20b9) as the default currency."
    "\n- Keep responses under 200 words."
)

RECOMMENDATIONS_PROMPT = (
    "/no_think\n"
    "Based on the user's financial data below, provide 3-5 actionable"
    " financial recommendations. Each should reference actual numbers."
    "\n\nReturn ONLY valid JSON:"
    '\n{"recommendations": ["rec1", "rec2"], "summary": "one sentence"}'
)


def _extract_ollama_content(data: dict) -> str:
    """Extract reply text from an Ollama response, handling Qwen3 thinking mode."""
    msg = data.get("message", {})
    content = msg.get("content", "")
    # Qwen3 models use "thinking" mode — content is empty,
    # the actual response lives in the "thinking" field.
    if not content:
        thinking = msg.get("thinking", "")
        # Strip the "Thinking Process:" preamble if present
        if "1." in thinking[:50]:
            parts = thinking.split("\n\n", 2)
            content = parts[-1] if len(parts) > 2 else thinking
        else:
            content = thinking
    return content.strip()


def _gather_financial_context(db: Session, user_id: str) -> str:
    """Build a financial context string from the user's data."""
    txns = (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id)
        .order_by(Transaction.txn_date.desc())
        .limit(20)
        .all()
    )

    cat_map = {c.id: c.name for c in db.query(Category).all()}

    spending: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    total_income = Decimal("0")
    total_expenses = Decimal("0")
    for t in txns:
        if t.amount < 0:
            spending[cat_map.get(t.category_id, "Uncategorized")] += -t.amount
            total_expenses += -t.amount
        else:
            total_income += t.amount

    budgets = db.query(Budget).filter(Budget.user_id == user_id).all()
    budget_lines = []
    for b in budgets:
        actual = compute_actual(db, user_id, b)
        cat_name = (
            cat_map.get(b.category_id, "Overall") if b.category_id else "Overall"
        )
        kind = "Spending limit" if b.kind == "spending_limit" else "Savings goal"
        budget_lines.append(
            f"  - {kind} for {cat_name}: \u20b9{actual:.0f}"
            f" / \u20b9{b.target_amount:.0f}"
            f" ({b.period_start} to {b.period_end})"
        )

    savings_pct = (
        f"{(total_income - total_expenses) / total_income * 100:.1f}%"
        if total_income > 0
        else "N/A (no income)"
    )
    lines = [
        "=== User's Financial Summary ===",
        f"Total income (recent): \u20b9{total_income:.0f}",
        f"Total expenses (recent): \u20b9{total_expenses:.0f}",
        f"Savings rate: {savings_pct}",
        "",
        "Recent transactions:",
    ]
    for t in txns[:15]:
        cat_name = cat_map.get(t.category_id, "Uncategorized")
        sign = "+" if t.amount >= 0 else "-"
        lines.append(
            f"  {t.txn_date} | {sign}\u20b9{abs(t.amount):.0f}"
            f" | {t.description} | {cat_name}"
        )

    if spending:
        lines.append("")
        lines.append("Spending by category:")
        for cat, total in sorted(
            spending.items(), key=lambda x: x[1], reverse=True
        ):
            lines.append(f"  - {cat}: \u20b9{total:.0f}")

    if budget_lines:
        lines.append("")
        lines.append("Budgets:")
        lines.extend(budget_lines)

    if not txns:
        lines.append("  No transactions recorded yet.")

    return "\n".join(lines)


def _get_llm_headers() -> dict[str, str]:
    if settings.llm_provider == "openai" and settings.openai_api_key:
        return {
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        }
    return {"Content-Type": "application/json"}


def _get_llm_url() -> str:
    if settings.llm_provider == "openai":
        return f"{settings.openai_base_url}/chat/completions"
    return f"{settings.ollama_base_url}/api/chat"


def _get_model() -> str:
    if settings.llm_provider == "openai":
        return settings.openai_model
    return settings.ollama_model


def _build_payload(messages: list[dict], stream: bool = False) -> dict:
    payload: dict = {
        "model": _get_model(),
        "messages": messages,
        "stream": stream,
    }
    if settings.llm_provider == "ollama":
        payload["think"] = False
        payload["options"] = {"temperature": 0.7, "num_predict": 512}
    else:
        payload["temperature"] = 0.7
        payload["max_tokens"] = 512
    return payload


async def chat_stream(db: Session, user_id: str, user_message: str):
    context = _gather_financial_context(db, user_id)
    messages = [
        {"role": "system", "content": f"{SYSTEM_PROMPT}\n\n{context}"},
        {"role": "user", "content": user_message},
    ]

    url = _get_llm_url()
    headers = _get_llm_headers()
    payload = _build_payload(messages, stream=True)

    async with httpx.AsyncClient(timeout=300.0) as client:
        async with client.stream(
            "POST", url, json=payload, headers=headers
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line:
                    continue
                chunk = json.loads(line)
                if settings.llm_provider == "ollama":
                    content = _extract_ollama_content(chunk)
                else:
                    delta = (
                        chunk.get("choices", [{}])[0].get("delta", {})
                    )
                    content = delta.get("content", "")
                if content:
                    yield content


async def chat_complete(db: Session, user_id: str, user_message: str) -> str:
    context = _gather_financial_context(db, user_id)
    messages = [
        {"role": "system", "content": f"{SYSTEM_PROMPT}\n\n{context}"},
        {"role": "user", "content": user_message},
    ]

    url = _get_llm_url()
    headers = _get_llm_headers()
    payload = _build_payload(messages, stream=False)

    logger.info("Calling LLM: %s model=%s", url, _get_model())

    async with httpx.AsyncClient(timeout=300.0) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    if settings.llm_provider == "ollama":
        content = _extract_ollama_content(data)
    else:
        content = (
            data.get("choices", [{}])[0].get("message", {}).get("content", "")
        )

    logger.info("LLM reply length: %d", len(content))
    if not content:
        logger.warning(
            "LLM returned empty content. Full response: %s",
            str(data)[:500],
        )

    return content or (
        "I wasn't able to generate a response."
        " Please try a simpler question."
    )


async def get_recommendations(db: Session, user_id: str) -> dict:
    context = _gather_financial_context(db, user_id)
    messages = [
        {
            "role": "system",
            "content": "You are a financial advisor. Return only valid JSON.",
        },
        {
            "role": "user",
            "content": f"{RECOMMENDATIONS_PROMPT}\n\n{context}",
        },
    ]

    url = _get_llm_url()
    headers = _get_llm_headers()
    payload = _build_payload(messages, stream=False)

    async with httpx.AsyncClient(timeout=300.0) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    if settings.llm_provider == "ollama":
        content = _extract_ollama_content(data)
    else:
        content = (
            data.get("choices", [{}])[0].get("message", {}).get("content", "")
        )

    content = content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[-1]
    if content.endswith("```"):
        content = content.rsplit("```", 1)[0]
    content = content.strip()

    logger.info("Recommendations raw content length: %d", len(content))
    logger.debug("Recommendations raw content: %s", content[:300])

    # Try direct parse first, then extract the first JSON object from the text
    result = None
    try:
        result = json.loads(content)
    except json.JSONDecodeError:
        start = content.find("{")
        end = content.rfind("}")
        if start != -1 and end > start:
            try:
                result = json.loads(content[start : end + 1])
            except json.JSONDecodeError:
                pass

    if result and "recommendations" in result:
        recs = result["recommendations"]
        if isinstance(recs, list):
            return {
                "recommendations": [str(r) for r in recs],
                "summary": str(result.get("summary", "")),
            }

    logger.warning(
        "Failed to parse LLM recommendations as JSON: %s",
        content[:200],
    )
    return {
        "recommendations": [
            "Unable to generate recommendations right now."
        ],
        "summary": "AI recommendations are temporarily unavailable.",
    }
