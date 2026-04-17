from app.config import get_settings
from app.core.errors import UnsupportedTaskTypeError
from app.schemas.agent import RegistryAgent


class AgentRegistry:
    def __init__(self) -> None:
        settings = get_settings()
        self._agents: list[RegistryAgent] = [
            RegistryAgent(
                name="echo_agent",
                description="Echoes input text and optionally delegates transformation",
                version="0.3.0",
                base_url=settings.echo_agent_url,
                card_url=f"{settings.echo_agent_url}/a2a/card",
                run_url=f"{settings.echo_agent_url}/a2a/run",
                supported_task_types=["echo", "echo_transform"],
                health_url=f"{settings.echo_agent_url}/health",
                status="configured",
            ),
            RegistryAgent(
                name="transform_agent",
                description="Transforms input text to uppercase",
                version="0.3.0",
                base_url=settings.transform_agent_url,
                card_url=f"{settings.transform_agent_url}/a2a/card",
                run_url=f"{settings.transform_agent_url}/a2a/run",
                supported_task_types=["transform"],
                health_url=f"{settings.transform_agent_url}/health",
                status="configured",
            ),
        ]

    def get_agent_for_task_type(self, task_type: str) -> RegistryAgent:
        for agent in self._agents:
            if task_type in agent.supported_task_types:
                return agent
        raise UnsupportedTaskTypeError(task_type)

    def get_agent_by_name(self, name: str) -> RegistryAgent:
        for agent in self._agents:
            if agent.name == name:
                return agent
        raise UnsupportedTaskTypeError(name)

    def list_agents(self) -> list[RegistryAgent]:
        return self._agents


agent_registry = AgentRegistry()
