# FinHealth AI — Switching LLM Providers

FinHealth supports any **OpenAI-compatible** API out of the box. This means you can use OpenAI, Grok (xAI), DeepSeek, or any other provider that exposes a `/v1/chat/completions` endpoint — just set an API key and a base URL.

---

## Quick Start

All changes go in **`backend/.env`**. No code changes needed.

### 1. Set the provider

```bash
LLM_PROVIDER=openai
```

This tells FinHealth to use the OpenAI-compatible path (`/v1/chat/completions`) instead of Ollama's `/api/chat`.

---

## Provider Configs

### OpenAI

| Variable | Value |
|---|---|
| `LLM_PROVIDER` | `openai` |
| `OPENAI_API_KEY` | `sk-...` (from [platform.openai.com](https://platform.openai.com)) |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` (default, can omit) |
| `OPENAI_MODEL` | `gpt-4o-mini` (default) or `gpt-4o`, `gpt-4.1-nano`, etc. |

```bash
# backend/.env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-proj-abc123...
OPENAI_MODEL=gpt-4o-mini
```

---

### Grok (xAI)

Grok uses the OpenAI-compatible format. Get your API key from [console.x.ai](https://console.x.ai).

| Variable | Value |
|---|---|
| `LLM_PROVIDER` | `openai` |
| `OPENAI_API_KEY` | `xai-...` (from xAI console) |
| `OPENAI_BASE_URL` | `https://api.x.ai/v1` |
| `OPENAI_MODEL` | `grok-3-mini` or `grok-3` |

```bash
# backend/.env
LLM_PROVIDER=openai
OPENAI_API_KEY=xai-abc123...
OPENAI_BASE_URL=https://api.x.ai/v1
OPENAI_MODEL=grok-3-mini
```

---

### DeepSeek

DeepSeek also uses the OpenAI-compatible format. Get your API key from [platform.deepseek.com](https://platform.deepseek.com).

| Variable | Value |
|---|---|
| `LLM_PROVIDER` | `openai` |
| `OPENAI_API_KEY` | `sk-...` (from DeepSeek platform) |
| `OPENAI_BASE_URL` | `https://api.deepseek.com/v1` |
| `OPENAI_MODEL` | `deepseek-chat` or `deepseek-reasoner` |

```bash
# backend/.env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-abc123...
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
```

---

### Ollama (Local — Default)

No API key needed. Just make sure Ollama is running.

```bash
# backend/.env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3.5:0.8b
```

---

## Any OpenAI-Compatible API

Any provider that serves an OpenAI-compatible `/v1/chat/completions` endpoint works. Just set:

```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=your-key
OPENAI_BASE_URL=https://their-api.com/v1
OPENAI_MODEL=model-name
```

Examples: Together AI, Fireworks, Groq, Anyscale, Mistral AI, Novita AI, etc.

---

## After Changing Config

Restart the backend:

```bash
cd backend
uvicorn app.main:app --reload
```

The dashboard recommendations will re-fetch on next visit (or click the refresh button). The chat will use the new provider on the next message.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `401 Unauthorized` | Check your API key is correct and has credits |
| `404 Not Found` | Check `OPENAI_BASE_URL` — make sure it ends with `/v1` |
| `429 Too Many Requests` | Rate limited — wait a moment and try again |
| `Connection refused` (Ollama) | Make sure Ollama is running: `ollama serve` |
| Empty response | Some models need different prompt tuning — check the model's docs |
| Recommendations showing stale data | Click the refresh button on the dashboard, or clear `finhealth_recs_cache` in browser localStorage |

---

## Model Recommendations

| Provider | Model | Speed | Quality | Cost |
|---|---|---|---|---|
| Ollama | `qwen3.5:0.8b` | Fast (local) | Basic | Free |
| Ollama | `llama3.1:8b` | Medium (local) | Good | Free |
| OpenAI | `gpt-4o-mini` | Fast | Great | ~$0.15/1M tokens |
| OpenAI | `gpt-4o` | Medium | Excellent | ~$2.50/1M tokens |
| Grok | `grok-3-mini` | Fast | Great | Low |
| DeepSeek | `deepseek-chat` | Fast | Great | Very low |
| DeepSeek | `deepseek-reasoner` | Slow | Excellent | Low |
