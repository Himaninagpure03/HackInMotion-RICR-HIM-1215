# Smart Expense Analyzer & Financial Health Dashboard

A full-stack app that turns raw transactions into an honest picture of your financial health — automatic categorization, spending pattern analysis, budget tracking, and a health score with plain-language recommendations.

Built for HackInMotion (FinTech track).

---

## Tech Stack

| Layer | Choice |
|---|---|
| Backend | FastAPI (Python) |
| Frontend | React + Vite |
| Database | PostgreSQL (via SQLAlchemy ORM) |
| Auth | Clerk |
| Charts | Recharts |

---

## Why Clerk for Auth

Requirement #1 calls for secure sign-up/login with careful handling of sensitive financial data. Rather than hand-roll password hashing, session management, and token issuance under hackathon time constraints, we delegated identity entirely to Clerk. Our backend never touches a password — it only verifies Clerk-issued JWTs against Clerk's public JWKS endpoint and extracts the user ID. This meaningfully reduces our own attack surface for exactly the kind of data (financial records) the problem statement asks us to protect carefully.

---

## Categorization Engine

**This is the technical core of the project, per the problem statement — documented here as required.**

### Approach chosen: rule-based keyword matching

Each transaction's description/merchant text is matched against a curated dictionary mapping keywords to categories (e.g. `"swiggy"`, `"zomato"` → `Food`; `"netflix"`, `"spotify"` → `Subscriptions`). First match wins; unmatched transactions are left uncategorized and can be corrected manually.

### Why this approach, and not ML or a third-party NLP API

We evaluated three options:

1. **Rule-based keyword matching** (chosen)
2. **A trained ML classifier** (e.g. a small text classifier over transaction descriptions)
3. **A third-party NLP/LLM API** for classification

Given a multi-day hackathon timeline, rule-based matching won on several axes that mattered for this project specifically:

- **Zero latency and zero cost per transaction** — no network call, no inference time, works instantly on CSV imports of any size.
- **Fully explainable** — for a finance app, being able to say "this was categorized as Food because it matched 'swiggy'" is a feature, not a limitation. ML/LLM categorization is harder to justify to an end user when it gets something wrong.
- **No training data required** — an ML classifier needs a labeled dataset we don't have; a third-party API needs API keys, rate limits, and cost management we didn't want to introduce this close to a deadline.
- **Fast to extend** — adding a new merchant is a one-line dictionary entry, which let us iterate quickly as we tested against realistic transaction descriptions.

The trade-off is coverage: merchants outside our keyword list are left uncategorized rather than guessed at. We consider this an acceptable trade for correctness — an uncategorized transaction is honest; a wrongly-categorized one silently corrupts the analytics built on top of it.

### How it's integrated

- `app/transactions/categorizer.py` holds the keyword dictionary and the `categorize(description) -> category_name | None` function.
- It's called from both the manual-entry endpoint (`POST /transactions`) and the CSV import pipeline (`POST /transactions/import`), so both paths get identical categorization behavior.
- Users can override the auto-assigned category on any transaction via `PATCH /transactions/{id}`, since no rule-based system will be 100% correct — this keeps a human in the loop without blocking automatic categorization for the common case.

### Path to improvement

The `categorize()` function's contract (`description: str -> category_name | None`) is the only thing callers depend on. It could be swapped for an ML model or an LLM-based classifier later without touching any other part of the codebase — noted here as a natural extension, not implemented due to time constraints.

---

## Architecture

Backend follows a feature-based module structure — each domain owns its own `models.py`, `schemas.py`, `router.py` (and `service.py` where business logic warrants separating it from the route handlers):

```
backend/app/
  core/          settings, DB engine/session
  auth/          Clerk JWT verification
  users/         local user profile, mirrors Clerk identity
  accounts/      bank accounts / cards (multi-account support)
  categories/    fixed category taxonomy, seeded at startup
  transactions/  manual entry, CSV import, categorization, dedup
  budgets/       spending limits & savings goals
  analytics/     dashboard aggregation, health score, historical snapshots
```

### Data model

- Every table with user-owned data (`transactions`, `accounts`, `budgets`) carries a `user_id` foreign key to Clerk's identity — this is the privacy boundary every query is scoped against, satisfying the "each user's data must be private" requirement.
- `transactions.dedupe_hash` (a hash of user + account + date + amount + description) has a uniqueness constraint, so re-uploading the same CSV statement — or double-submitting a manual entry — is a safe no-op rather than a duplicate.
- `analysis_snapshots` persists a point-in-time copy of the computed health score, so historical analysis survives even as new transactions keep changing the live numbers.

---

## Setup

### Backend (local development)
```bash
cd backend
docker compose up -d          # starts Postgres
cp .env.example .env          # fill in CLERK_ISSUER and DB credentials
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head          # create/migrate the schema
uvicorn app.main:app --reload
```

`CLERK_ISSUER` can be derived from your Clerk publishable key (`pk_test_...`) — decode the base64 portion after the prefix to get your Clerk Frontend API URL.

Schema changes are managed with Alembic (`migrations/versions/`) — never `create_all()`. To add one:

```bash
alembic revision --autogenerate -m "describe change"   # review the generated file!
alembic upgrade head
```

If you have a pre-existing database built by an older version of the app (auto-created tables, no migration history), adopt the baseline once with `alembic stamp head`.

### Production deploy (Docker)
```bash
cd backend
cp .env.example .env          # real values: CLERK_ISSUER, strong POSTGRES_PASSWORD, CORS_ORIGINS
docker compose -f docker-compose.prod.yml up -d --build
```

This builds the API image (multi-worker uvicorn, non-root), starts Postgres on an internal network, runs migrations automatically before serving, and health-checks the API at `/readyz`. TLS termination is expected at your edge (load balancer, Cloudflare, Caddy, ...). Useful knobs in `.env`: `WEB_CONCURRENCY` (uvicorn workers), `API_PORT`, `LOG_LEVEL`, rate-limit settings.

### Frontend
```bash
cd frontend
npm install
cp .env.example .env          # fill in VITE_CLERK_PUBLISHABLE_KEY
npm run dev
```

---

## Feature Checklist

| Requirement | Status |
|---|---|
| Secure sign-up/login | Clerk |
| Manual transaction entry | Done |
| CSV bulk import with messy-data handling | Handles varying column names, date formats, missing fields, duplicates |
| Automatic categorization | Rule-based (see above) |
| Spending pattern analysis | Category breakdown + month-over-month trend |
| Financial health score & recommendations | Done |
| Budget & savings goal tracking | Done |
| Visual dashboard | Pie chart, bar chart, progress bars |
| Database persistence (incl. historical analysis) | PostgreSQL
| Responsive UI | CSS grid auto-collapses on narrow viewports |
| Error handling | Malformed CSV rows reported per-row, not fatal |
| **Bonus:** Multi-account support | Done |
