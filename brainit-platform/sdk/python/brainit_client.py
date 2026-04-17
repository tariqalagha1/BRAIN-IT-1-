from __future__ import annotations

import time
from typing import Any

import requests


class BrainItClientError(Exception):
    def __init__(
        self,
        message: str,
        *,
        status: int | None = None,
        details: Any | None = None,
        cause: Exception | None = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.details = details
        self.cause = cause


class BrainItClient:
    def __init__(self, *, base_url: str, api_key: str | None = None, timeout: float = 15.0) -> None:
        if not base_url:
            raise BrainItClientError("base_url is required")

        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout

    def run_task(
        self,
        *,
        task_type: str,
        input_payload: dict[str, Any],
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if not task_type:
            raise BrainItClientError("task_type is required")
        if not isinstance(input_payload, dict):
            raise BrainItClientError("input_payload must be a dict")

        payload: dict[str, Any] = {
            "task_type": task_type,
            "input_payload": input_payload,
        }
        if metadata is not None:
            payload["metadata"] = metadata

        return self._request("POST", "/v1/orchestrate", json=payload)

    def get_task(self, task_id: str) -> dict[str, Any]:
        if not task_id:
            raise BrainItClientError("task_id is required")

        return self._request("GET", f"/v1/tasks/{task_id}")

    def get_agents(self) -> list[dict[str, Any]]:
        return self._request("GET", "/v1/agents")

    def wait_for_completion(
        self,
        task_id: str,
        *,
        interval_seconds: float = 1.5,
        timeout_seconds: float = 60.0,
    ) -> dict[str, Any]:
        if not task_id:
            raise BrainItClientError("task_id is required")

        started_at = time.time()
        while time.time() - started_at < timeout_seconds:
            task = self.get_task(task_id)
            status = task.get("status")
            if status in {"completed", "failed"}:
                return task
            time.sleep(interval_seconds)

        raise BrainItClientError(
            f"Timed out waiting for task {task_id} to complete after {timeout_seconds} seconds"
        )

    def _request(self, method: str, path: str, json: dict[str, Any] | None = None) -> Any:
        url = f"{self.base_url}{path}"
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["X-API-Key"] = self.api_key

        try:
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                json=json,
                timeout=self.timeout,
            )
        except requests.RequestException as exc:
            raise BrainItClientError(f"Network error while calling {url}: {exc}", cause=exc) from exc

        try:
            data = response.json() if response.content else None
        except ValueError as exc:
            raise BrainItClientError(
                "Response was not valid JSON",
                status=response.status_code,
                cause=exc,
            ) from exc

        if not response.ok:
            detail = self._extract_detail(data)
            if response.status_code == 401:
                raise BrainItClientError(
                    f"Unauthorized (401). Check your API key. {detail}".strip(),
                    status=response.status_code,
                    details=data,
                )
            raise BrainItClientError(
                f"Request failed ({response.status_code}). {detail}".strip(),
                status=response.status_code,
                details=data,
            )

        return data

    @staticmethod
    def _extract_detail(data: Any) -> str:
        if not isinstance(data, dict):
            return ""
        detail = data.get("detail")
        if isinstance(detail, str):
            return detail
        message = data.get("message")
        if isinstance(message, str):
            return message
        return ""
