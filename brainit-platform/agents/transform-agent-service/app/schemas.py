from pydantic import BaseModel


class AgentCard(BaseModel):
    name: str
    description: str
    version: str
    supported_task_types: list[str]
    endpoint: str
    downstream_agents: list[str]
    auth_scheme: str
    health_url: str


class RunRequest(BaseModel):
    task_type: str = "transform"
    text: str


class RunResponse(BaseModel):
    output: dict
    execution_steps: list[dict]
    a2a_calls: list[dict]
