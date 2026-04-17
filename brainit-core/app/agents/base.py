from abc import ABC, abstractmethod
from typing import Any

from app.schemas.agent import AgentCard


class BaseAgent(ABC):
    @property
    @abstractmethod
    def card(self) -> AgentCard:
        raise NotImplementedError

    @abstractmethod
    def run(self, input_payload: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError
