import logging

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from .accounts import models as account_models  # noqa: F401
from .accounts.router import router as accounts_router
from .analytics import models as analytics_models  # noqa: F401
from .analytics.router import router as analytics_router
from .bills import models as bill_models  # noqa: F401
from .bills.router import router as bills_router
from .budgets import models as budget_models  # noqa: F401
from .budgets.router import router as budgets_router
from .categories import models as category_models  # noqa: F401
from .categories.router import router as categories_router
from .chatbot.router import router as chatbot_router
from .core.config import settings
from .core.database import get_db
from .core.ratelimit import RateLimitMiddleware
from .transactions import models as transaction_models  # noqa: F401
from .transactions.router import router as transactions_router
from .users import models as user_models  # noqa: F401
from .users.router import router as users_router

logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)

# Model modules are imported above only to register tables on Base.metadata;
# the schema itself is owned by Alembic migrations (migrations/versions).
app = FastAPI(title="Financial Health Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    RateLimitMiddleware,
    default_limit_per_minute=settings.rate_limit_per_minute,
    upload_limit_per_minute=settings.upload_rate_limit_per_minute,
)

app.include_router(users_router)
app.include_router(accounts_router)
app.include_router(categories_router)
app.include_router(transactions_router)
app.include_router(budgets_router)
app.include_router(analytics_router)
app.include_router(bills_router)
app.include_router(chatbot_router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Last-resort handler: log the traceback server-side, never leak it to clients."""
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.get("/health")
def health():
    """Liveness — cheap, no dependencies. Used for container restart decisions."""
    return {"status": "ok"}


@app.get("/readyz")
def readyz(db: Session = Depends(get_db)):
    """Readiness — verifies the database is actually reachable."""
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        logger.warning("Readiness check failed: database unreachable", exc_info=True)
        return JSONResponse(
            status_code=503,
            content={"status": "unavailable", "reason": "database unreachable"},
        )
    return {"status": "ok"}
