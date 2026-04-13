from fastapi import APIRouter, Depends

from app.deps import get_current_user
from app.schemas import DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_summary(user=Depends(get_current_user)):
    # Lightweight placeholder analytics until the clinical event pipeline is integrated.
    return DashboardSummary(
        active_patients=18,
        completed_sessions=126,
        open_tasks=5,
        monthly_revenue=2840.50 if user.role == "admin" else 1190.00,
    )
