from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    app_name: str = "Echo Agent Service"
    app_env: str = "development"
    app_version: str = "0.3.0"
    request_timeout_seconds: float = 8.0
    transform_agent_run_url: str = "http://127.0.0.1:18621/a2a/run"


@lru_cache
def get_settings() -> Settings:
    return Settings()
