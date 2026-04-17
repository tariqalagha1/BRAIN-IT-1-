from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class OrchestrateRequest(BaseModel):
    task_type: str = Field(min_length=1, max_length=100)
    input_payload: dict[str, Any]
    tenant_id: str | None = None


class OrchestrateResponse(BaseModel):
    task_id: str
    status: TaskStatus
    agent_used: str | None
    output_payload: dict[str, Any] | None


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    task_id: str = Field(alias="id")
    tenant_id: str | None
    task_type: str
    input_payload: dict[str, Any]
    output_payload: dict[str, Any] | None
    status: TaskStatus
    agent_used: str | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime
