from typing import Any

import httpx

from app.config import get_settings
from app.core.errors import AgentServiceError
from app.schemas.agent import AgentCard, RegistryAgent


class AgentHttpClient:
    def __init__(self) -> None:
        settings = get_settings()
        self.timeout = settings.request_timeout_seconds

    def fetch_card(self, agent: RegistryAgent) -> AgentCard:
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(agent.card_url)
                response.raise_for_status()
        except httpx.TimeoutException as exc:
            raise AgentServiceError(f"Timeout calling card endpoint for {agent.name}") from exc
        except httpx.HTTPError as exc:
            raise AgentServiceError(f"Failed to fetch card for {agent.name}: {exc}") from exc
        return AgentCard.model_validate(response.json())

    def run_agent(self, agent: RegistryAgent, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(agent.run_url, json=payload)
                response.raise_for_status()
        except httpx.TimeoutException as exc:
            raise AgentServiceError(f"Timeout calling run endpoint for {agent.name}") from exc
        except httpx.HTTPStatusError as exc:
            detail = self._extract_error_detail(exc.response)
            raise AgentServiceError(
                f"Remote error from {agent.name}: {detail}",
                execution_steps=detail.get("execution_steps", []),
                a2a_calls=detail.get("a2a_calls", []),
            ) from exc
        except httpx.HTTPError as exc:
            raise AgentServiceError(f"Failed to call run endpoint for {agent.name}: {exc}") from exc

        return response.json()

    @staticmethod
    def _extract_error_detail(response: httpx.Response) -> dict[str, Any]:
        payload = response.json() if response.content else {}
        detail = payload.get("detail", payload)
        if isinstance(detail, dict):
            return detail
        return {"message": str(detail)}
