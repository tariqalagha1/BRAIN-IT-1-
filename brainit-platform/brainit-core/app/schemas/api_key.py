from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


PlanType = Literal["free", "pro", "enterprise"]


class ApiKeyCreateRequest(BaseModel):
    client_name: str = Field(min_length=1, max_length=255)
    tenant_id: str = Field(min_length=1, max_length=64)
    plan_type: PlanType = "free"
    usage_limit: int | None = Field(default=None, ge=1)


class ApiKeyCreateResponse(BaseModel):
    id: str
    key_prefix: str
    plaintext_key: str
    client_name: str
    tenant_id: str
    plan_type: str
    usage_limit: int | None
    is_active: bool
    created_at: datetime


class ApiKeyMetadataResponse(BaseModel):
    id: str
    key_prefix: str
    client_name: str
    tenant_id: str
    plan_type: str
    usage_limit: int | None
    is_active: bool
    created_at: datetime
    last_used_at: datetime | None
