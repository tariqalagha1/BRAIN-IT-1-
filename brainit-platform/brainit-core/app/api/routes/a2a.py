from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session

from app.core.errors import AgentServiceError, UnsupportedTaskTypeError
from app.database import get_db
from app.schemas.agent import AgentCard, AgentRunRequest
from app.services.agent_http_client import AgentHttpClient
from app.services.registry_service import RegistryService

router = APIRouter(prefix="/a2a/agents/echo", tags=["a2a"])
client = AgentHttpClient()
registry_service = RegistryService()


@router.get("/card", response_model=AgentCard)
def get_echo_agent_card(db: Session = Depends(get_db)) -> AgentCard:
    try:
        agent = registry_service.get_agent_by_name(db, "echo_agent")
        if agent is None:
            raise UnsupportedTaskTypeError("echo_agent")
        return client.fetch_card(agent)
    except UnsupportedTaskTypeError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    except AgentServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post("/run")
def run_echo_agent(payload: AgentRunRequest, db: Session = Depends(get_db)) -> dict:
    try:
        agent = registry_service.get_agent_by_name(db, "echo_agent")
        if agent is None:
            raise UnsupportedTaskTypeError("echo_agent")
        return client.run_agent(agent, payload.model_dump())
    except UnsupportedTaskTypeError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    except AgentServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
