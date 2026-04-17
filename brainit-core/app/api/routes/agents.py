from fastapi import APIRouter

from app.agents.registry import agent_registry
from app.schemas.agent import AgentCard

router = APIRouter(prefix="/v1", tags=["agents"])


@router.get("/agents", response_model=list[AgentCard])
def list_agents() -> list[AgentCard]:
    return agent_registry.list_cards()
