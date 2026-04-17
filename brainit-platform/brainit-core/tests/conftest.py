import os

import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite:///./brainit_core_test_phase3.db"

from app.database import Base, SessionLocal, engine, init_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.api_key import ApiKey  # noqa: E402
from app.models.task import Task  # noqa: E402
from app.services.registry_service import RegistryService  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def setup_db() -> None:
    Base.metadata.drop_all(bind=engine)
    init_db()
    with SessionLocal() as db:
        RegistryService().seed_initial_registry(db)


@pytest.fixture(autouse=True)
def reset_db() -> None:
    Base.metadata.drop_all(bind=engine)
    init_db()
    with SessionLocal() as db:
        RegistryService().seed_initial_registry(db)


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client
