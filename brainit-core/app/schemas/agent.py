from typing import Any

from pydantic import BaseModel


class AgentCard(BaseModel):
    name: str
    description: str
    version: str
    supported_task_types: list[str]
    endpoint: str
    auth_scheme: str
    health_status: str


class AgentRunRequest(BaseModel):
    text: str


class AgentRunResponse(BaseModel):
    echo: str
    agent: str
    metadata: dict[str, Any]
