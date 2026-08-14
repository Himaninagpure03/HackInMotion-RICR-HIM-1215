from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .accounts import models as account_models  # noqa: F401
from .accounts.router import router as accounts_router
from .analytics import models as analytics_models  # noqa: F401
from .analytics.router import router as analytics_router
from .budgets import models as budget_models  # noqa: F401
from .budgets.router import router as budgets_router
from .categories import models as category_models  # noqa: F401
from .categories.router import router as categories_router
from .categories.seed import seed_categories
from .core.config import settings
from .core.database import Base, SessionLocal, engine
from .transactions import models as transaction_models  # noqa: F401
from .transactions.router import router as transactions_router
from .users import models as user_models  # noqa: F401
from .users.router import router as users_router
from .bills import models as bill_models
from .bills.router import router as bills_router

Base.metadata.create_all(bind=engine)

with SessionLocal() as db:
    seed_categories(db)

app = FastAPI(title="Financial Health Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users_router)
app.include_router(accounts_router)
app.include_router(categories_router)
app.include_router(transactions_router)
app.include_router(budgets_router)
app.include_router(analytics_router)
app.include_router(bills_router)


@app.get("/health")
def health():
    return {"status": "ok"}
