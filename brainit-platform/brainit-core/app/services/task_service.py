from typing import Any

from sqlalchemy.orm import Session

from app.models.task import Task
from app.schemas.task import TaskStatus
from app.services.usage_service import UsageService


class TaskService:
    def __init__(self) -> None:
        self.usage_service = UsageService()

    def create_task(
        self,
        db: Session,
        task_type: str,
        input_payload: dict[str, Any],
        tenant_id: str | None = None,
        client_name: str | None = None,
        created_by_api_key_id: str | None = None,
        registry_snapshot: dict[str, Any] | None = None,
    ) -> Task:
        task = Task(
            task_type=task_type,
            input_payload=input_payload,
            tenant_id=tenant_id,
            client_name=client_name,
            created_by_api_key_id=created_by_api_key_id,
            registry_snapshot=registry_snapshot,
            status=TaskStatus.PENDING.value,
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        self.usage_service.log_task_event(db, task, "created")
        return task

    def update_task(
        self,
        db: Session,
        task: Task,
        status: TaskStatus,
        output_payload: dict[str, Any] | None = None,
        execution_steps: list[dict[str, Any]] | None = None,
        a2a_calls: list[dict[str, Any]] | None = None,
        registry_snapshot: dict[str, Any] | None = None,
        agent_used: str | None = None,
        error_message: str | None = None,
    ) -> Task:
        task.status = status.value
        if output_payload is not None:
            task.output_payload = output_payload
        if execution_steps is not None:
            task.execution_steps = execution_steps
        if a2a_calls is not None:
            task.a2a_calls = a2a_calls
        if registry_snapshot is not None:
            task.registry_snapshot = registry_snapshot
        if agent_used is not None:
            task.agent_used = agent_used
        task.error_message = error_message
        db.add(task)
        db.commit()
        db.refresh(task)
        if status in {TaskStatus.COMPLETED, TaskStatus.FAILED}:
            self.usage_service.log_task_event(db, task, status.value)
        return task

    def get_task(self, db: Session, task_id: str) -> Task | None:
        return db.get(Task, task_id)
