from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    clerk_issuer: str
    clerk_secret_key: str | None = None
    clerk_jwks_url: str | None = None  # override only if your JWKS lives elsewhere
    database_url: str = "postgresql://finance:finance@localhost:5433/finance"
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def jwks_url(self) -> str:
        return self.clerk_jwks_url or f"{self.clerk_issuer}/.well-known/jwks.json"


settings = Settings()
