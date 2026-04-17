from fastapi import APIRouter, Depends

from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.agent import RegistryAgentResponse
from app.services.registry_service import RegistryService

router = APIRouter(prefix="/v1", tags=["agents"])
registry_service = RegistryService()


@router.get("/agents", response_model=list[RegistryAgentResponse])
def list_agents(db: Session = Depends(get_db)) -> list[RegistryAgentResponse]:
    agents = registry_service.list_agents(db)
    return [RegistryAgentResponse.model_validate(agent) for agent in agents]
