from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    clerk_issuer: str
    clerk_secret_key: str | None = None
    clerk_jwks_url: str | None = None  # override only if your JWKS lives elsewhere
    database_url: str  # required — no default, so a missing env var fails fast at startup
    cors_origins: list[str] = ["http://localhost:5173"]
    log_level: str = "INFO"
    max_upload_bytes: int = 10 * 1024 * 1024  # CSV imports are capped at 10 MB
    rate_limit_per_minute: int = 120
    upload_rate_limit_per_minute: int = 10

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        # .env is shared with docker compose (POSTGRES_*, API_PORT, ...), so
        # ignore app-irrelevant keys instead of crashing on them.
        extra="ignore",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_cors_origins(cls, value: object) -> object:
        """Accept both JSON arrays and comma-separated lists in CORS_ORIGINS."""
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def jwks_url(self) -> str:
        return self.clerk_jwks_url or f"{self.clerk_issuer}/.well-known/jwks.json"


settings = Settings()
