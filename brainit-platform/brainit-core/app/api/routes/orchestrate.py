from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.auth import ClientContext, get_client_context
from app.core.errors import AgentServiceError, UnsupportedTaskTypeError
from app.database import get_db
from app.schemas.task import OrchestrateRequest, OrchestrateResponse
from app.services.api_key_service import ApiKeyService
from app.services.orchestrator import OrchestratorService
from app.services.usage_service import UsageService

router = APIRouter(prefix="/v1", tags=["orchestrate"])
orchestrator_service = OrchestratorService()
api_key_service = ApiKeyService()
usage_service = UsageService()


@router.post("/orchestrate", response_model=OrchestrateResponse)
def orchestrate_task(
    payload: OrchestrateRequest,
    db: Session = Depends(get_db),
    client_context: ClientContext = Depends(get_client_context),
) -> OrchestrateResponse:
    if client_context.api_key_id:
        api_key = api_key_service.get_key(db, client_context.api_key_id)
        if api_key is None or not api_key.is_active:
            raise HTTPException(status_code=401, detail="Invalid or inactive API key")

        if usage_service.is_rate_limit_exceeded(db, api_key):
            return JSONResponse(
                status_code=429,
                content={
                    "error": "rate_limit_exceeded",
                    "message": "You have reached your daily limit",
                },
            )

    try:
        task = orchestrator_service.run(db, payload, client_context)
    except UnsupportedTaskTypeError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    except AgentServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    return OrchestrateResponse(
        task_id=task.id,
        status=task.status,
        agent_used=task.agent_used,
        output_payload=task.output_payload,
        execution_steps=task.execution_steps,
        a2a_calls=task.a2a_calls,
        error_message=task.error_message,
    )
