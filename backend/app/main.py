from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .core.database import Base, engine
from .users import models as user_models  # noqa: F401  (registers table with Base before create_all)
from .users.router import router as users_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Financial Health Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users_router)


@app.get("/health")
def health():
    return {"status": "ok"}
