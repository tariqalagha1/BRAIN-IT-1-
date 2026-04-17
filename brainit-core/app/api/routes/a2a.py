from fastapi import APIRouter

from app.agents.registry import agent_registry
from app.schemas.agent import AgentCard, AgentRunRequest, AgentRunResponse

router = APIRouter(prefix="/a2a/agents/echo", tags=["a2a"])


@router.get("/card", response_model=AgentCard)
def get_echo_agent_card() -> AgentCard:
    return agent_registry.get_agent_by_name("echo_agent").card


@router.post("/run", response_model=AgentRunResponse)
def run_echo_agent(payload: AgentRunRequest) -> AgentRunResponse:
    agent = agent_registry.get_agent_by_name("echo_agent")
    result = agent.run({"text": payload.text})
    return AgentRunResponse.model_validate(result)
