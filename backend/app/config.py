from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=True)

    APP_NAME: str = "ClinicalMind API"
    APP_ENV: str = "development"
    SECRET_KEY: str = Field(default="change-this-in-production", min_length=16)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    DATABASE_URL: str = "sqlite:///./clinicalmind.db"
    CORS_ORIGINS: str = "http://localhost:3000"
    ADMIN_EMAILS: str = "admin@clinicalmind.app"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def admin_emails(self) -> set[str]:
        return {email.strip().lower() for email in self.ADMIN_EMAILS.split(",") if email.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()
