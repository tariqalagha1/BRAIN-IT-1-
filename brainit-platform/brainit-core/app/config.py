import logging
import sys
from functools import lru_cache

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_SENTINEL = "MISSING"

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    app_name: str = "Brain it Core"
    app_env: str = "development"
    log_level: str = "INFO"
    database_url: str = Field(default=_SENTINEL)
    request_timeout_seconds: float = 8.0
    brainit_core_url: str = "http://127.0.0.1:18601"
    echo_agent_url: str = Field(
        default=_SENTINEL,
        validation_alias=AliasChoices("ECHO_AGENT_URL", "ECHO_AGENT_BASE_URL"),
    )
    transform_agent_url: str = Field(
        default=_SENTINEL,
        validation_alias=AliasChoices("TRANSFORM_AGENT_URL", "TRANSFORM_AGENT_BASE_URL"),
    )
    plan_free_daily_limit: int = 50
    plan_pro_daily_limit: int = 500
    require_api_key: bool = False
    default_dev_api_key: str | None = None

    @field_validator("database_url", "echo_agent_url", "transform_agent_url", mode="after")
    @classmethod
    def _require_set(cls, value: str, info: object) -> str:
        field_name = getattr(info, "field_name", "unknown")
        if value == _SENTINEL:
            logger.critical(
                "STARTUP ABORTED — required env var not set: %s. "
                "Set it in .env or the environment before starting.",
                field_name.upper(),
            )
            sys.exit(1)
        return value

    def log_config(self) -> None:
        logger.info("=" * 56)
        logger.info("Brain it Core — startup configuration")
        logger.info("  environment : %s", self.app_env)
        logger.info("  database_url: %s", self._redact(self.database_url))
        logger.info("  echo_agent  : %s", self.echo_agent_url)
        logger.info("  transform   : %s", self.transform_agent_url)
        logger.info("  require_key : %s", self.require_api_key)
        logger.info("=" * 56)

    @staticmethod
    def _redact(url: str) -> str:
        """Hide password in postgres:// DSNs for log safety."""
        if "://" in url and "@" in url:
            scheme, rest = url.split("://", 1)
            return f"{scheme}://***@{rest.split('@', 1)[1]}"
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()
