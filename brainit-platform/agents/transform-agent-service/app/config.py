from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    app_name: str = "Transform Agent Service"
    app_env: str = "development"
    app_version: str = "0.3.0"


@lru_cache
def get_settings() -> Settings:
    return Settings()
