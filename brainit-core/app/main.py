from fastapi import FastAPI

from app.api.routes.a2a import router as a2a_router
from app.api.routes.agents import router as agents_router
from app.api.routes.health import router as health_router
from app.api.routes.orchestrate import router as orchestrate_router
from app.api.routes.tasks import router as tasks_router
from app.config import get_settings
from app.core.logging import configure_logging
from app.database import init_db, check_db_connection

settings = get_settings()

configure_logging()
init_db()

app = FastAPI(title=settings.app_name)

# Root-level health check endpoint (for Docker healthcheck)
@app.get("/health")
def root_health_check():
    """Health check endpoint for orchestration and monitoring."""
    db_ok = check_db_connection()
    return {
        "status": "ok" if db_ok else "degraded",
        "service": "brainit-core",
        "database": "ok" if db_ok else "error"
    }

app.include_router(health_router)
app.include_router(orchestrate_router)
app.include_router(tasks_router)
app.include_router(agents_router)
app.include_router(a2a_router)
