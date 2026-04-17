from fastapi import APIRouter, HTTPException

from app.config import get_settings
from app.schemas import AgentCard, RunRequest, RunResponse
from app.services.agent_client import DownstreamAgentClient, DownstreamCallError

router = APIRouter()
settings = get_settings()
client = DownstreamAgentClient()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/a2a/card", response_model=AgentCard)
def card() -> AgentCard:
    return AgentCard(
        name="echo_agent",
        description="Echoes input text and optionally delegates transformation",
        version=settings.app_version,
        supported_task_types=["echo", "echo_transform"],
        endpoint="/a2a/run",
        downstream_agents=["transform_agent"],
        auth_scheme="none",
        health_url="/health",
    )


@router.post("/a2a/run", response_model=RunResponse)
def run(payload: RunRequest) -> RunResponse:
    if payload.task_type not in {"echo", "echo_transform"}:
        raise HTTPException(status_code=400, detail={"message": f"Unsupported task type: {payload.task_type}"})

    echo_step = {
        "step": 1,
        "agent": "echo_agent",
        "service": "echo-agent-service",
        "input": {"text": payload.text},
        "output": {"echo": payload.text},
        "status": "completed",
    }

    if payload.task_type == "echo":
        return RunResponse(
            output={"echo": payload.text, "agent": "echo_agent"},
            execution_steps=[echo_step],
            a2a_calls=[],
        )

    try:
        transform_response = client.call_transform(payload.text)
    except DownstreamCallError as exc:
        failed_step = {
            "step": 2,
            "agent": "transform_agent",
            "service": "transform-agent-service",
            "input": {"text": payload.text},
            "output": None,
            "status": "failed",
            "error": str(exc),
        }
        failed_call = {
            "from_agent": "echo_agent",
            "to_agent": "transform_agent",
            "request": {"text": payload.text},
            "response": {"error": str(exc)},
            "status": "failed",
        }
        raise HTTPException(
            status_code=502,
            detail={
                "message": str(exc),
                "execution_steps": [echo_step, failed_step],
                "a2a_calls": [failed_call],
            },
        ) from exc

    transform_step = {
        "step": 2,
        "agent": "transform_agent",
        "service": "transform-agent-service",
        "input": {"text": payload.text},
        "output": transform_response.get("output"),
        "status": "completed",
    }
    a2a_call = {
        "from_agent": "echo_agent",
        "to_agent": "transform_agent",
        "request": {"text": payload.text},
        "response": transform_response.get("output"),
        "status": "completed",
    }

    output = {
        "echo": payload.text,
        "transformed": transform_response.get("output", {}).get("result"),
        "agent": "echo_agent",
    }

    return RunResponse(
        output=output,
        execution_steps=[echo_step, transform_step],
        a2a_calls=[a2a_call],
    )
