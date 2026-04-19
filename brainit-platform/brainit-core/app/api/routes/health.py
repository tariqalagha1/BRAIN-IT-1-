from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check(db: Session = Depends(get_db)) -> dict[str, str]:
    settings = get_settings()

    db_status = "ok"
    try:
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
    except Exception:
        db_status = "error"

    return {
        "status": "ok",
        "service": "brainit-core",
        "version": "v1",
        "environment": settings.app_env,
        "db": db_status,
    }
