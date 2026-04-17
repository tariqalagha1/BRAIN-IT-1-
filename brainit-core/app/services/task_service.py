from typing import Any

from sqlalchemy.orm import Session

from app.models.task import Task
from app.schemas.task import TaskStatus


class TaskService:
    def create_task(
        self,
        db: Session,
        task_type: str,
        input_payload: dict[str, Any],
        tenant_id: str | None = None,
    ) -> Task:
        task = Task(
            task_type=task_type,
            input_payload=input_payload,
            tenant_id=tenant_id,
            status=TaskStatus.PENDING.value,
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return task

    def update_task(
        self,
        db: Session,
        task: Task,
        status: TaskStatus,
        output_payload: dict[str, Any] | None = None,
        agent_used: str | None = None,
        error_message: str | None = None,
    ) -> Task:
        task.status = status.value
        if output_payload is not None:
            task.output_payload = output_payload
        if agent_used is not None:
            task.agent_used = agent_used
        task.error_message = error_message
        db.add(task)
        db.commit()
        db.refresh(task)
        return task

    def get_task(self, db: Session, task_id: str) -> Task | None:
        return db.get(Task, task_id)
