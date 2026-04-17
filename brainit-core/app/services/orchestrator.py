from typing import Any

from sqlalchemy.orm import Session

from app.agents.registry import agent_registry
from app.core.errors import UnsupportedTaskTypeError
from app.models.task import Task
from app.schemas.task import OrchestrateRequest, TaskStatus
from app.services.task_service import TaskService


class OrchestratorService:
    def __init__(self) -> None:
        self.task_service = TaskService()

    def run(self, db: Session, request: OrchestrateRequest) -> Task:
        task = self.task_service.create_task(
            db=db,
            task_type=request.task_type,
            input_payload=request.input_payload,
            tenant_id=request.tenant_id,
        )

        self.task_service.update_task(db, task, status=TaskStatus.RUNNING)

        try:
            agent = agent_registry.get_agent_for_task_type(request.task_type)
            output = agent.run(request.input_payload)
            return self.task_service.update_task(
                db,
                task,
                status=TaskStatus.COMPLETED,
                output_payload=output,
                agent_used=agent.card.name,
            )
        except UnsupportedTaskTypeError as exc:
            self.task_service.update_task(db, task, status=TaskStatus.FAILED, error_message=exc.detail)
            raise
        except Exception as exc:  # noqa: BLE001
            self.task_service.update_task(db, task, status=TaskStatus.FAILED, error_message=str(exc))
            raise
