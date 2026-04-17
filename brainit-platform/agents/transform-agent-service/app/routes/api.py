from fastapi import APIRouter

from app.config import get_settings
from app.schemas import AgentCard, RunRequest, RunResponse

router = APIRouter()
settings = get_settings()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/a2a/card", response_model=AgentCard)
def card() -> AgentCard:
    return AgentCard(
        name="transform_agent",
        description="Transforms input text to uppercase",
        version=settings.app_version,
        supported_task_types=["transform"],
        endpoint="/a2a/run",
        downstream_agents=[],
        auth_scheme="none",
        health_url="/health",
    )


@router.post("/a2a/run", response_model=RunResponse)
def run(payload: RunRequest) -> RunResponse:
    transformed = payload.text.upper()
    step = {
        "step": 1,
        "agent": "transform_agent",
        "service": "transform-agent-service",
        "input": {"text": payload.text},
        "output": {"result": transformed},
        "status": "completed",
    }

    return RunResponse(
        output={"result": transformed, "agent": "transform_agent"},
        execution_steps=[step],
        a2a_calls=[],
    )
