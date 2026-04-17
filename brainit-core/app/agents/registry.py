from app.agents.base import BaseAgent
from app.agents.echo_agent import EchoAgent
from app.core.errors import UnsupportedTaskTypeError
from app.schemas.agent import AgentCard


class AgentRegistry:
    def __init__(self) -> None:
        self._agents: list[BaseAgent] = [EchoAgent()]

    def get_agent_for_task_type(self, task_type: str) -> BaseAgent:
        for agent in self._agents:
            if task_type in agent.card.supported_task_types:
                return agent
        raise UnsupportedTaskTypeError(task_type)

    def get_agent_by_name(self, name: str) -> BaseAgent:
        for agent in self._agents:
            if agent.card.name == name:
                return agent
        raise UnsupportedTaskTypeError(name)

    def list_cards(self) -> list[AgentCard]:
        return [agent.card for agent in self._agents]


agent_registry = AgentRegistry()
