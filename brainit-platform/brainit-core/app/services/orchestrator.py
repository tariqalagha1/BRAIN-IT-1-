from typing import Any
from datetime import datetime

from sqlalchemy.orm import Session

from app.core.auth import ClientContext
from app.core.errors import AgentServiceError, UnsupportedTaskTypeError
from app.models.task import Task
from app.schemas.task import OrchestrateRequest, TaskStatus
from app.services.agent_http_client import AgentHttpClient
from app.services.registry_service import RegistryService
from app.services.task_service import TaskService


class OrchestratorService:
    def __init__(self) -> None:
        self.task_service = TaskService()
        self.agent_client = AgentHttpClient()
        self.registry_service = RegistryService()

    def run(self, db: Session, request: OrchestrateRequest, client_context: ClientContext | None = None) -> Task:
        client_context = client_context or ClientContext()
        registry_snapshot: dict[str, Any] = {
            "task_type": request.task_type,
            "selected_agent": None,
            "candidates": [],
            "resolved_at": datetime.utcnow().isoformat(),
        }
        task = self.task_service.create_task(
            db=db,
            task_type=request.task_type,
            input_payload=request.input_payload,
            tenant_id=client_context.tenant_id or request.tenant_id,
            client_name=client_context.client_name,
            created_by_api_key_id=client_context.api_key_id,
            registry_snapshot=registry_snapshot,
        )

        try:
            agent = self.registry_service.resolve_by_task_type(db, request.task_type)
            registry_snapshot = self.registry_service.get_registry_snapshot(db, request.task_type, agent)
            self.task_service.update_task(
                db,
                task,
                status=TaskStatus.RUNNING,
                registry_snapshot=registry_snapshot,
            )
            payload = {"task_type": request.task_type, **request.input_payload}
            remote_response = self.agent_client.run_agent(agent, payload)

            execution_steps = remote_response.get("execution_steps", [])
            a2a_calls = remote_response.get("a2a_calls", [])
            output_payload = remote_response.get("output", remote_response)
            if execution_steps:
                execution_steps[0]["registry_resolution"] = registry_snapshot

            return self.task_service.update_task(
                db,
                task,
                status=TaskStatus.COMPLETED,
                output_payload=output_payload,
                execution_steps=execution_steps,
                a2a_calls=a2a_calls,
                registry_snapshot=registry_snapshot,
                agent_used=agent.name,
            )

        except UnsupportedTaskTypeError as exc:
            self.task_service.update_task(
                db,
                task,
                status=TaskStatus.FAILED,
                error_message=exc.detail,
                execution_steps=[
                    {
                        "step": 1,
                        "agent": "orchestrator",
                        "service": "brainit-core",
                        "status": "failed",
                        "error": exc.detail,
                        "registry_resolution": registry_snapshot,
                    }
                ],
            )
            raise

        except AgentServiceError as exc:
            failed_steps = exc.execution_steps or []
            failed_calls = exc.a2a_calls or []
            if not failed_steps:
                failed_steps = [
                    {
                        "step": 1,
                        "agent": "orchestrator",
                        "service": "brainit-core",
                        "status": "failed",
                        "error": exc.detail,
                        "registry_resolution": registry_snapshot,
                    }
                ]
            elif failed_steps:
                failed_steps[0]["registry_resolution"] = registry_snapshot
            self.task_service.update_task(
                db,
                task,
                status=TaskStatus.FAILED,
                error_message=exc.detail,
                execution_steps=failed_steps,
                a2a_calls=failed_calls,
            )
            raise

        except Exception as exc:  # noqa: BLE001
            self.task_service.update_task(
                db,
                task,
                status=TaskStatus.FAILED,
                error_message=str(exc),
                execution_steps=[
                    {
                        "step": 1,
                        "agent": "orchestrator",
                        "service": "brainit-core",
                        "status": "failed",
                        "error": str(exc),
                        "registry_resolution": registry_snapshot,
                    }
                ],
            )
            raise
