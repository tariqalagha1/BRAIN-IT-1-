from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.task import TaskResponse
from app.services.task_service import TaskService

router = APIRouter(prefix="/v1", tags=["tasks"])
task_service = TaskService()


@router.get("/tasks/{task_id}", response_model=TaskResponse, response_model_by_alias=False)
def get_task(task_id: str, db: Session = Depends(get_db)) -> TaskResponse:
    task = task_service.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskResponse.model_validate(task)
