from datetime import datetime, timezone
from typing import Any

from app.agents.base import BaseAgent
from app.schemas.agent import AgentCard


class EchoAgent(BaseAgent):
    @property
    def card(self) -> AgentCard:
        return AgentCard(
            name="echo_agent",
            description="Returns the same text payload",
            version="0.1.0",
            supported_task_types=["echo"],
            endpoint="/a2a/agents/echo/run",
            auth_scheme="none",
            health_status="healthy",
        )

    def run(self, input_payload: dict[str, Any]) -> dict[str, Any]:
        text = str(input_payload.get("text", ""))
        return {
            "echo": text,
            "agent": self.card.name,
            "metadata": {"timestamp": datetime.now(timezone.utc).isoformat()},
        }
