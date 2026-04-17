from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import ClientContext, get_client_context
from app.database import get_db
from app.schemas.usage import UsageLimitsResponse, UsageSummaryResponse
from app.services.api_key_service import ApiKeyService
from app.services.usage_service import UsageService

router = APIRouter(prefix="/v1/usage", tags=["usage"])
api_key_service = ApiKeyService()
usage_service = UsageService()


@router.get("", response_model=UsageSummaryResponse)
def get_usage(
    db: Session = Depends(get_db),
    client_context: ClientContext = Depends(get_client_context),
) -> UsageSummaryResponse:
    if not client_context.api_key_id or not client_context.tenant_id:
        raise HTTPException(status_code=401, detail="API key authentication is required")

    summary = usage_service.get_usage_summary(db, client_context.tenant_id)
    return UsageSummaryResponse(**summary)


@router.get("/limits", response_model=UsageLimitsResponse)
def get_usage_limits(
    db: Session = Depends(get_db),
    client_context: ClientContext = Depends(get_client_context),
) -> UsageLimitsResponse:
    if not client_context.api_key_id:
        raise HTTPException(status_code=401, detail="API key authentication is required")

    api_key = api_key_service.get_key(db, client_context.api_key_id)
    if api_key is None or not api_key.is_active:
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")

    limits = usage_service.get_limit_summary(db, api_key)
    return UsageLimitsResponse(**limits)
