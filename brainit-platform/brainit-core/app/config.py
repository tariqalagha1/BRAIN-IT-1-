from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    app_name: str = "Brain it Core"
    app_env: str = "development"
    log_level: str = "INFO"
    database_url: str = "sqlite:///./brainit_platform_core.db"
    request_timeout_seconds: float = 8.0
    brainit_core_url: str = "http://127.0.0.1:18601"
    echo_agent_url: str = Field(
        default="http://127.0.0.1:18611",
        validation_alias=AliasChoices("ECHO_AGENT_URL", "ECHO_AGENT_BASE_URL"),
    )
    transform_agent_url: str = Field(
        default="http://127.0.0.1:18621",
        validation_alias=AliasChoices("TRANSFORM_AGENT_URL", "TRANSFORM_AGENT_BASE_URL"),
    )
    plan_free_daily_limit: int = 50
    plan_pro_daily_limit: int = 500
    require_api_key: bool = False
    default_dev_api_key: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
