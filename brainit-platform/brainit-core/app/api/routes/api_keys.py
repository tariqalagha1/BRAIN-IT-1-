from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import ClientContext, get_client_context
from app.database import get_db
from app.schemas.api_key import ApiKeyCreateRequest, ApiKeyCreateResponse, ApiKeyMetadataResponse
from app.services.api_key_service import ApiKeyService

router = APIRouter(prefix="/v1/api-keys", tags=["api-keys"])
api_key_service = ApiKeyService()


@router.post("", response_model=ApiKeyCreateResponse, status_code=201)
def create_api_key(payload: ApiKeyCreateRequest, db: Session = Depends(get_db)) -> ApiKeyCreateResponse:
    api_key, plaintext_key = api_key_service.create_key(db, payload)
    return ApiKeyCreateResponse(
        id=api_key.id,
        key_prefix=api_key.key_prefix,
        plaintext_key=plaintext_key,
        client_name=api_key.client_name,
        tenant_id=api_key.tenant_id,
        plan_type=api_key.plan_type,
        usage_limit=api_key.usage_limit,
        is_active=api_key.is_active,
        created_at=api_key.created_at,
    )


@router.get("", response_model=list[ApiKeyMetadataResponse])
def list_api_keys(
    db: Session = Depends(get_db),
    client_context: ClientContext = Depends(get_client_context),
) -> list[ApiKeyMetadataResponse]:
    if not client_context.api_key_id or not client_context.tenant_id:
        raise HTTPException(status_code=401, detail="API key authentication is required")

    keys = api_key_service.list_keys_by_tenant(db, client_context.tenant_id)
    return [
        ApiKeyMetadataResponse(
            id=key.id,
            key_prefix=key.key_prefix,
            client_name=key.client_name,
            tenant_id=key.tenant_id,
            plan_type=key.plan_type,
            usage_limit=key.usage_limit,
            is_active=key.is_active,
            created_at=key.created_at,
            last_used_at=key.last_used_at,
        )
        for key in keys
    ]


@router.post("/{key_id}/disable", response_model=ApiKeyMetadataResponse)
def disable_api_key(
    key_id: str,
    db: Session = Depends(get_db),
    client_context: ClientContext = Depends(get_client_context),
) -> ApiKeyMetadataResponse:
    if not client_context.api_key_id or not client_context.tenant_id:
        raise HTTPException(status_code=401, detail="API key authentication is required")

    api_key = api_key_service.get_key(db, key_id)
    if api_key is None:
        raise HTTPException(status_code=404, detail="API key not found")
    if api_key.tenant_id != client_context.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")

    disabled = api_key_service.disable_key(db, api_key)
    return ApiKeyMetadataResponse(
        id=disabled.id,
        key_prefix=disabled.key_prefix,
        client_name=disabled.client_name,
        tenant_id=disabled.tenant_id,
        plan_type=disabled.plan_type,
        usage_limit=disabled.usage_limit,
        is_active=disabled.is_active,
        created_at=disabled.created_at,
        last_used_at=disabled.last_used_at,
    )
