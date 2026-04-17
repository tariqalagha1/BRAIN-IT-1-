from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.config import get_settings

settings = get_settings()
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app.models.agent_registry import AgentRegistry  # noqa: F401
    from app.models.api_key import ApiKey  # noqa: F401
    from app.models.task import Task  # noqa: F401
    from app.models.usage_log import UsageLog  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _sync_sqlite_schema()


def _sync_sqlite_schema() -> None:
    if not settings.database_url.startswith("sqlite"):
        return

    inspector = inspect(engine)
    task_expected_columns = {
        "tenant_id": "VARCHAR(64)",
        "output_payload": "JSON",
        "execution_steps": "JSON",
        "a2a_calls": "JSON",
        "agent_used": "VARCHAR(100)",
        "error_message": "TEXT",
        "client_name": "VARCHAR(255)",
        "created_by_api_key_id": "VARCHAR(36)",
        "registry_snapshot": "JSON",
    }

    api_key_expected_columns = {
        "tenant_id": "VARCHAR(64)",
        "plan_type": "VARCHAR(32) DEFAULT 'free'",
        "usage_limit": "INTEGER",
    }

    with engine.begin() as connection:
        _sync_sqlite_table_columns(inspector, connection, "tasks", task_expected_columns)
        _sync_sqlite_table_columns(inspector, connection, "api_keys", api_key_expected_columns)


def _sync_sqlite_table_columns(inspector, connection, table_name: str, expected_columns: dict[str, str]) -> None:
    if not inspector.has_table(table_name):
        return

    existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
    for column_name, column_type in expected_columns.items():
        if column_name in existing_columns:
            continue
        connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"))
