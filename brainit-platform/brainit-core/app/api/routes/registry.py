from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.errors import AgentServiceError
from app.database import get_db
from app.schemas.agent import RegistryAgentCreate, RegistryAgentResponse, RegistryAgentUpdate
from app.services.registry_service import DuplicateAgentNameError, RegistryService

router = APIRouter(prefix="/v1/registry", tags=["registry"])
registry_service = RegistryService()


@router.get("/agents", response_model=list[RegistryAgentResponse])
def list_registry_agents(db: Session = Depends(get_db)) -> list[RegistryAgentResponse]:
    agents = registry_service.list_agents(db)
    return [RegistryAgentResponse.model_validate(agent) for agent in agents]


@router.post("/agents", response_model=RegistryAgentResponse, status_code=201)
def create_registry_agent(payload: RegistryAgentCreate, db: Session = Depends(get_db)) -> RegistryAgentResponse:
    try:
        agent = registry_service.register_agent(db, payload)
    except DuplicateAgentNameError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return RegistryAgentResponse.model_validate(agent)


@router.get("/agents/{agent_id}", response_model=RegistryAgentResponse)
def get_registry_agent(agent_id: str, db: Session = Depends(get_db)) -> RegistryAgentResponse:
    agent = registry_service.get_agent(db, agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return RegistryAgentResponse.model_validate(agent)


@router.put("/agents/{agent_id}", response_model=RegistryAgentResponse)
def update_registry_agent(agent_id: str, payload: RegistryAgentUpdate, db: Session = Depends(get_db)) -> RegistryAgentResponse:
    agent = registry_service.get_agent(db, agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    try:
        updated = registry_service.update_agent(db, agent, payload)
    except DuplicateAgentNameError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return RegistryAgentResponse.model_validate(updated)


@router.post("/agents/{agent_id}/enable", response_model=RegistryAgentResponse)
def enable_registry_agent(agent_id: str, db: Session = Depends(get_db)) -> RegistryAgentResponse:
    agent = registry_service.get_agent(db, agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return RegistryAgentResponse.model_validate(registry_service.enable_agent(db, agent))


@router.post("/agents/{agent_id}/disable", response_model=RegistryAgentResponse)
def disable_registry_agent(agent_id: str, db: Session = Depends(get_db)) -> RegistryAgentResponse:
    agent = registry_service.get_agent(db, agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return RegistryAgentResponse.model_validate(registry_service.disable_agent(db, agent))


@router.post("/agents/{agent_id}/health-check", response_model=RegistryAgentResponse)
def health_check_registry_agent(agent_id: str, db: Session = Depends(get_db)) -> RegistryAgentResponse:
    agent = registry_service.get_agent(db, agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    try:
        checked = registry_service.perform_health_check(db, agent)
    except AgentServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return RegistryAgentResponse.model_validate(checked)
