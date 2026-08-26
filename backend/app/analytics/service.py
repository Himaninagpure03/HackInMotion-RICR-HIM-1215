from collections import defaultdict
from decimal import Decimal

from sqlalchemy.orm import Session

from ..budgets.models import Budget
from ..budgets.service import compute_actual
from ..categories.models import Category
from ..transactions.models import Transaction
from .schemas import CategoryBreakdown, DashboardOut, HealthScoreOut, MonthlyTrendPoint


def category_breakdown(db: Session, user_id: str) -> list[CategoryBreakdown]:
    rows = (
        db.query(Category.name, Transaction.amount)
        .join(Transaction, Transaction.category_id == Category.id)
        .filter(Transaction.user_id == user_id, Transaction.amount < 0)
        .all()
    )
    totals: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    for name, amount in rows:
        totals[name] += -amount

    return sorted(
        (CategoryBreakdown(category=name, total=total) for name, total in totals.items()),
        key=lambda c: c.total,
        reverse=True,
    )


def monthly_trend(db: Session, user_id: str) -> list[MonthlyTrendPoint]:
    rows = (
        db.query(Transaction.txn_date, Transaction.amount)
        .filter(Transaction.user_id == user_id)
        .all()
    )

    buckets: dict[str, dict[str, Decimal]] = defaultdict(
        lambda: {"income": Decimal("0"), "expenses": Decimal("0")}
    )
    for txn_date, amount in rows:
        key = txn_date.strftime("%Y-%m")
        if amount >= 0:
            buckets[key]["income"] += amount
        else:
            buckets[key]["expenses"] += -amount

    return [
        MonthlyTrendPoint(month=month, income=v["income"], expenses=v["expenses"])
        for month, v in sorted(buckets.items())
    ]


def health_score(db: Session, user_id: str, trend: list[MonthlyTrendPoint]) -> HealthScoreOut:
    total_income = sum((m.income for m in trend), Decimal("0"))
    total_expenses = sum((m.expenses for m in trend), Decimal("0"))
    if not trend:
      return HealthScoreOut(
        score=None,
        savings_rate=0,
        total_income=total_income,
        total_expenses=total_expenses,
        recommendations=[
            "Add some transactions to calculate your financial health."
          ],
      )
    savings_rate = (
        float((total_income - total_expenses) / total_income) if total_income > 0 else 0.0
    )
    savings_rate = max(-1.0, min(savings_rate, 1.0))

    spending_budgets = (
        db.query(Budget).filter(Budget.user_id == user_id, Budget.kind == "spending_limit").all()
    )
    if spending_budgets:
        within_target = sum(
            1 for b in spending_budgets if compute_actual(db, user_id, b) <= b.target_amount
        )
        adherence_rate = within_target / len(spending_budgets)
    else:
        adherence_rate = 1.0  # no budgets set yet — don't penalize for it

    # 60% weight on savings rate (capped at 50% savings = full marks),
    # 40% weight on staying within whatever spending limits are set.
    savings_component = max(0.0, min(savings_rate, 0.5)) / 0.5
    score = round((0.6 * savings_component + 0.4 * adherence_rate) * 100)
    score = max(0, min(score, 100))

    recommendations: list[str] = []
    if savings_rate < 0:
        recommendations.append(
            "You're spending more than you're earning this period — "
            "worth a closer look at your top categories."
        )

    category_map = {c.id: c.name for c in db.query(Category).all()}
    for b in spending_budgets:
        actual = compute_actual(db, user_id, b)
        if actual > b.target_amount:
            over_by = actual - b.target_amount
            label = (
                category_map.get(b.category_id, "your overall budget")
                if b.category_id
                else "your overall budget"
            )
            recommendations.append(f"You're over budget on {label} by {over_by:.2f} this period.")

    return HealthScoreOut(
        score=score,
        savings_rate=round(savings_rate * 100, 1),
        total_income=total_income,
        total_expenses=total_expenses,
        recommendations=recommendations,
    )


def get_dashboard(db: Session, user_id: str) -> DashboardOut:
    trend = monthly_trend(db, user_id)
    return DashboardOut(
        category_breakdown=category_breakdown(db, user_id),
        monthly_trend=trend,
        health=health_score(db, user_id, trend),
    )
