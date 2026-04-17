from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.a2a import router as a2a_router
from app.api.routes.agents import router as agents_router
from app.api.routes.api_keys import router as api_keys_router
from app.api.routes.health import router as health_router
from app.api.routes.orchestrate import router as orchestrate_router
from app.api.routes.registry import router as registry_router
from app.api.routes.tasks import router as tasks_router
from app.api.routes.usage import router as usage_router
from app.config import get_settings
from app.core.logging import configure_logging
from app.database import SessionLocal, init_db
from app.services.registry_service import RegistryService

settings = get_settings()

configure_logging()
init_db()
with SessionLocal() as db:
	RegistryService().seed_initial_registry(db)

app = FastAPI(title=settings.app_name)
app.add_middleware(
	CORSMiddleware,
	allow_origins=["http://127.0.0.1:3000", "http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3001"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)
app.include_router(health_router)
app.include_router(orchestrate_router)
app.include_router(tasks_router)
app.include_router(agents_router)
app.include_router(registry_router)
app.include_router(api_keys_router)
app.include_router(usage_router)
app.include_router(a2a_router)
