from pydantic import BaseModel
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.services.api_key_service import ApiKeyService


class ClientContext(BaseModel):
    api_key_id: str | None = None
    client_name: str | None = None
    tenant_id: str | None = None
    plan_type: str | None = None
    usage_limit: int | None = None
    auth_type: str = "anonymous"


api_key_service = ApiKeyService()


def get_client_context(
    db: Session = Depends(get_db),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> ClientContext:
    settings = get_settings()

    if x_api_key and settings.default_dev_api_key and x_api_key == settings.default_dev_api_key:
        return ClientContext(client_name="dev-default", tenant_id=None, auth_type="dev")

    if not x_api_key:
        if settings.require_api_key:
            raise HTTPException(status_code=401, detail="Missing X-API-Key header")
        return ClientContext()

    api_key = api_key_service.verify_active_key(db, x_api_key)
    if api_key is None:
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")

    api_key_service.mark_used(db, api_key)
    return ClientContext(
        api_key_id=api_key.id,
        client_name=api_key.client_name,
        tenant_id=api_key.tenant_id,
        plan_type=api_key.plan_type,
        usage_limit=api_key.usage_limit,
        auth_type="api_key",
    )
