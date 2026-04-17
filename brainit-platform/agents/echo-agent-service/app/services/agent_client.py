import httpx

from app.config import get_settings


class DownstreamCallError(Exception):
    def __init__(self, message: str, execution_steps: list[dict], a2a_calls: list[dict]):
        self.execution_steps = execution_steps
        self.a2a_calls = a2a_calls
        super().__init__(message)


class DownstreamAgentClient:
    def __init__(self) -> None:
        settings = get_settings()
        self.timeout = settings.request_timeout_seconds
        self.transform_run_url = settings.transform_agent_run_url

    def call_transform(self, text: str) -> dict:
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(self.transform_run_url, json={"task_type": "transform", "text": text})
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as exc:
            raise DownstreamCallError(
                message=f"Failed downstream call to transform_agent: {exc}",
                execution_steps=[],
                a2a_calls=[],
            ) from exc
