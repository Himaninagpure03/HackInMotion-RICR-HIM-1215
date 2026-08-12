from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .categories import models as category_models  # noqa: F401  (registers table before create_all)
from .categories.router import router as categories_router
from .categories.seed import seed_categories
from .core.config import settings
from .core.database import Base, SessionLocal, engine
from .users import models as user_models  # noqa: F401
from .users.router import router as users_router

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
app.include_router(categories_router)

@app.get("/health")
def health():
    return {"status": "ok"}
