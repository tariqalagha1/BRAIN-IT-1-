from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.deps import get_current_user

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/summary", response_model=schemas.BillingSummary)
def billing_summary(user=Depends(get_current_user), db: Session = Depends(get_db)):
    invoices = crud.get_invoices_for_user(db, user.id)
    return schemas.BillingSummary(
        plans=["Starter", "Growth", "Enterprise"],
        invoices=invoices,
    )
