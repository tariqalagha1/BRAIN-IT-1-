from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class AgentCard(BaseModel):
    name: str
    description: str
    version: str
    supported_task_types: list[str]
    endpoint: str
    downstream_agents: list[str] = []
    auth_scheme: str
    health_url: str


class RegistryAgent(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str | None = None
    name: str
    description: str
    version: str
    base_url: str
    card_url: str
    run_url: str
    supported_task_types: list[str]
    health_url: str
    status: str
    downstream_agents: list[str] | None = None
    is_enabled: bool = True
    last_health_check_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class RegistryAgentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1)
    version: str = Field(min_length=1, max_length=32)
    base_url: str = Field(min_length=1, max_length=255)
    card_url: str = Field(min_length=1, max_length=255)
    run_url: str = Field(min_length=1, max_length=255)
    health_url: str = Field(min_length=1, max_length=255)
    supported_task_types: list[str] = Field(min_length=1)
    downstream_agents: list[str] | None = None
    status: str = "configured"
    is_enabled: bool = True


class RegistryAgentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    version: str | None = Field(default=None, min_length=1, max_length=32)
    base_url: str | None = Field(default=None, min_length=1, max_length=255)
    card_url: str | None = Field(default=None, min_length=1, max_length=255)
    run_url: str | None = Field(default=None, min_length=1, max_length=255)
    health_url: str | None = Field(default=None, min_length=1, max_length=255)
    supported_task_types: list[str] | None = None
    downstream_agents: list[str] | None = None
    status: str | None = None
    is_enabled: bool | None = None


class RegistryAgentResponse(RegistryAgent):
    id: str
    created_at: datetime
    updated_at: datetime


class AgentRunRequest(BaseModel):
    task_type: str = "echo"
    text: str


class AgentRunResponse(BaseModel):
    output: dict[str, Any]
    execution_steps: list[dict[str, Any]] | None = None
    a2a_calls: list[dict[str, Any]] | None = None
