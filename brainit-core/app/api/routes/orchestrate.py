from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.errors import UnsupportedTaskTypeError
from app.database import get_db
from app.schemas.task import OrchestrateRequest, OrchestrateResponse
from app.services.orchestrator import OrchestratorService

router = APIRouter(prefix="/v1", tags=["orchestrate"])
orchestrator_service = OrchestratorService()


@router.post("/orchestrate", response_model=OrchestrateResponse)
def orchestrate_task(payload: OrchestrateRequest, db: Session = Depends(get_db)) -> OrchestrateResponse:
    try:
        task = orchestrator_service.run(db, payload)
    except UnsupportedTaskTypeError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    return OrchestrateResponse(
        task_id=task.id,
        status=task.status,
        agent_used=task.agent_used,
        output_payload=task.output_payload,
    )
