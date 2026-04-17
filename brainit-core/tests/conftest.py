import os

import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite:///./brainit_core_test.db"

from app.database import SessionLocal, init_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.task import Task  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def setup_db() -> None:
    init_db()


@pytest.fixture(autouse=True)
def clean_tasks() -> None:
    db = SessionLocal()
    try:
        db.query(Task).delete()
        db.commit()
    finally:
        db.close()


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client
