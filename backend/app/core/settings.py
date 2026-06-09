"""
Централизованные настройки приложения.

Все секреты и тумблеры читаются из переменных окружения. На локалке —
через .env (через python-dotenv, который подтягивается автоматически
pydantic-settings).
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ---------- Anthropic ----------
    anthropic_api_key: str | None = Field(default=None, alias="ANTHROPIC_API_KEY")
    anthropic_model: str = Field(default="claude-sonnet-4-20250514", alias="ANTHROPIC_MODEL")

    # ---------- RapidAPI (Bayut и т.п.) ----------
    rapidapi_key: str | None = Field(default=None, alias="RAPIDAPI_KEY")
    bayut_rapidapi_host: str = Field(default="bayut.p.rapidapi.com", alias="BAYUT_RAPIDAPI_HOST")

    # ---------- CORS ----------
    # Список через запятую, например:
    # "https://property-ai-workspace.vercel.app,http://localhost:5173"
    allowed_origins: str = Field(
        default="http://127.0.0.1:5173,http://localhost:5173,tauri://localhost",
        alias="ALLOWED_ORIGINS"
    )

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    # ---------- Infra ----------
    redis_url: str = Field(default="redis://localhost:6379", alias="REDIS_URL")
    database_url: str | None = Field(default=None, alias="DATABASE_URL")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
