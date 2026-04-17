from datetime import datetime
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.errors import AgentServiceError, UnsupportedTaskTypeError
from app.models.agent_registry import AgentRegistry
from app.schemas.agent import RegistryAgentCreate, RegistryAgentResponse, RegistryAgentUpdate


class DuplicateAgentNameError(ValueError):
    pass


class RegistryService:
    def __init__(self) -> None:
        settings = get_settings()
        self.timeout = settings.request_timeout_seconds

    def seed_initial_registry(self, db: Session) -> None:
        settings = get_settings()
        seed_agents = [
            {
                "name": "echo_agent",
                "description": "Echoes input text and optionally delegates transformation",
                "version": "0.4.0",
                "base_url": settings.echo_agent_url,
                "card_url": f"{settings.echo_agent_url}/a2a/card",
                "run_url": f"{settings.echo_agent_url}/a2a/run",
                "health_url": f"{settings.echo_agent_url}/health",
                "supported_task_types": ["echo", "echo_transform"],
                "downstream_agents": ["transform_agent"],
                "status": "configured",
                "is_enabled": True,
            },
            {
                "name": "transform_agent",
                "description": "Transforms input text to uppercase",
                "version": "0.4.0",
                "base_url": settings.transform_agent_url,
                "card_url": f"{settings.transform_agent_url}/a2a/card",
                "run_url": f"{settings.transform_agent_url}/a2a/run",
                "health_url": f"{settings.transform_agent_url}/health",
                "supported_task_types": ["transform"],
                "downstream_agents": [],
                "status": "configured",
                "is_enabled": True,
            },
        ]

        for payload in seed_agents:
            existing = db.query(AgentRegistry).filter(AgentRegistry.name == payload["name"]).one_or_none()
            if existing is None:
                db.add(AgentRegistry(**payload))
        db.commit()

    def list_agents(self, db: Session) -> list[AgentRegistry]:
        return db.query(AgentRegistry).order_by(AgentRegistry.created_at.asc()).all()

    def get_agent(self, db: Session, agent_id: str) -> AgentRegistry | None:
        return db.get(AgentRegistry, agent_id)

    def get_agent_by_name(self, db: Session, name: str) -> AgentRegistry | None:
        return db.query(AgentRegistry).filter(AgentRegistry.name == name).one_or_none()

    def register_agent(self, db: Session, payload: RegistryAgentCreate) -> AgentRegistry:
        if self.get_agent_by_name(db, payload.name):
            raise DuplicateAgentNameError(f"Agent with name '{payload.name}' already exists")

        agent = AgentRegistry(**payload.model_dump())
        db.add(agent)
        db.commit()
        db.refresh(agent)
        return agent

    def update_agent(self, db: Session, agent: AgentRegistry, payload: RegistryAgentUpdate) -> AgentRegistry:
        updates = payload.model_dump(exclude_unset=True)
        if "name" in updates and updates["name"] != agent.name:
            existing = self.get_agent_by_name(db, updates["name"])
            if existing and existing.id != agent.id:
                raise DuplicateAgentNameError(f"Agent with name '{updates['name']}' already exists")

        for key, value in updates.items():
            setattr(agent, key, value)
        db.add(agent)
        db.commit()
        db.refresh(agent)
        return agent

    def enable_agent(self, db: Session, agent: AgentRegistry) -> AgentRegistry:
        agent.is_enabled = True
        db.add(agent)
        db.commit()
        db.refresh(agent)
        return agent

    def disable_agent(self, db: Session, agent: AgentRegistry) -> AgentRegistry:
        agent.is_enabled = False
        db.add(agent)
        db.commit()
        db.refresh(agent)
        return agent

    def resolve_by_task_type(self, db: Session, task_type: str) -> AgentRegistry:
        for agent in self.list_agents(db):
            if not agent.is_enabled:
                continue
            if agent.status not in {"configured", "healthy"}:
                continue
            if task_type in (agent.supported_task_types or []):
                return agent
        raise UnsupportedTaskTypeError(task_type)

    def get_registry_snapshot(self, db: Session, task_type: str, selected_agent: AgentRegistry) -> dict[str, Any]:
        candidates = [
            {
                "id": agent.id,
                "name": agent.name,
                "status": agent.status,
                "is_enabled": agent.is_enabled,
                "supported_task_types": agent.supported_task_types,
            }
            for agent in self.list_agents(db)
            if task_type in (agent.supported_task_types or [])
        ]
        return {
            "task_type": task_type,
            "selected_agent": {
                "id": selected_agent.id,
                "name": selected_agent.name,
                "run_url": selected_agent.run_url,
                "status": selected_agent.status,
                "is_enabled": selected_agent.is_enabled,
            },
            "candidates": candidates,
            "resolved_at": datetime.utcnow().isoformat(),
        }

    def perform_health_check(self, db: Session, agent: AgentRegistry) -> AgentRegistry:
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(agent.health_url)
                response.raise_for_status()
            agent.status = "healthy"
        except httpx.HTTPError as exc:
            agent.status = "unhealthy"
            db.add(agent)
            agent.last_health_check_at = datetime.utcnow()
            db.commit()
            db.refresh(agent)
            raise AgentServiceError(f"Health check failed for {agent.name}: {exc}") from exc

        agent.last_health_check_at = datetime.utcnow()
        db.add(agent)
        db.commit()
        db.refresh(agent)
        return agent
