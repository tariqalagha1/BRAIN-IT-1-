from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.deps import require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/summary", response_model=schemas.AdminSummary)
def admin_summary(
    _=Depends(require_admin),
    db: Session = Depends(get_db),
):
    return schemas.AdminSummary(**crud.get_user_counts(db))
