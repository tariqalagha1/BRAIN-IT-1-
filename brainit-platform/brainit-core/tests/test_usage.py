from app.config import get_settings
from app.models.usage_log import UsageLog
from app.services.agent_http_client import AgentHttpClient


def _fake_run_agent(self, agent, payload):
    return {
        "output": {"echo": payload["text"], "agent": agent.name},
        "execution_steps": [
            {
                "step": 1,
                "agent": agent.name,
                "service": "echo-agent-service",
                "status": "completed",
            }
        ],
        "a2a_calls": [],
    }


def test_usage_logging_and_tenant_inheritance(client, monkeypatch):
    monkeypatch.setattr(AgentHttpClient, "run_agent", _fake_run_agent)

    key_response = client.post(
        "/v1/api-keys",
        json={
            "client_name": "Usage Tenant",
            "tenant_id": "tenant-usage",
            "plan_type": "free",
        },
    )
    plaintext_key = key_response.json()["plaintext_key"]

    settings = get_settings()
    original_require = settings.require_api_key
    settings.require_api_key = True
    try:
        run_response = client.post(
            "/v1/orchestrate",
            headers={"X-API-Key": plaintext_key},
            json={"task_type": "echo", "input_payload": {"text": "usage-check"}},
        )
    finally:
        settings.require_api_key = original_require

    assert run_response.status_code == 200
    task_id = run_response.json()["task_id"]

    task_payload = client.get(f"/v1/tasks/{task_id}").json()
    assert task_payload["tenant_id"] == "tenant-usage"

    from app.database import SessionLocal

    with SessionLocal() as db:
        logs = db.query(UsageLog).filter(UsageLog.task_id == task_id).order_by(UsageLog.timestamp.asc()).all()
        assert [entry.status for entry in logs] == ["created", "completed"]
        assert logs[0].tenant_id == "tenant-usage"


def test_rate_limit_enforcement_returns_structured_error(client, monkeypatch):
    monkeypatch.setattr(AgentHttpClient, "run_agent", _fake_run_agent)

    key_response = client.post(
        "/v1/api-keys",
        json={
            "client_name": "Rate Limit Client",
            "tenant_id": "tenant-rate",
            "plan_type": "free",
            "usage_limit": 1,
        },
    )
    plaintext_key = key_response.json()["plaintext_key"]

    settings = get_settings()
    original_require = settings.require_api_key
    settings.require_api_key = True
    try:
        first = client.post(
            "/v1/orchestrate",
            headers={"X-API-Key": plaintext_key},
            json={"task_type": "echo", "input_payload": {"text": "first"}},
        )
        second = client.post(
            "/v1/orchestrate",
            headers={"X-API-Key": plaintext_key},
            json={"task_type": "echo", "input_payload": {"text": "second"}},
        )
    finally:
        settings.require_api_key = original_require

    assert first.status_code == 200
    assert second.status_code == 429
    assert second.json() == {
        "error": "rate_limit_exceeded",
        "message": "You have reached your daily limit",
    }


def test_usage_endpoints_expose_summary_and_limits(client, monkeypatch):
    monkeypatch.setattr(AgentHttpClient, "run_agent", _fake_run_agent)

    key_response = client.post(
        "/v1/api-keys",
        json={
            "client_name": "Usage API Client",
            "tenant_id": "tenant-usage-api",
            "plan_type": "pro",
        },
    )
    plaintext_key = key_response.json()["plaintext_key"]

    settings = get_settings()
    original_require = settings.require_api_key
    settings.require_api_key = True
    try:
        run_response = client.post(
            "/v1/orchestrate",
            headers={"X-API-Key": plaintext_key},
            json={"task_type": "echo", "input_payload": {"text": "metrics"}},
        )
        usage_response = client.get("/v1/usage", headers={"X-API-Key": plaintext_key})
        limits_response = client.get("/v1/usage/limits", headers={"X-API-Key": plaintext_key})
    finally:
        settings.require_api_key = original_require

    assert run_response.status_code == 200
    assert usage_response.status_code == 200
    assert limits_response.status_code == 200

    usage_payload = usage_response.json()
    assert usage_payload["total_tasks"] >= 1
    assert usage_payload["tasks_today"] >= 1
    assert usage_payload["success_count"] >= 1

    limits_payload = limits_response.json()
    assert limits_payload["plan_type"] == "pro"
    assert limits_payload["daily_limit"] == get_settings().plan_pro_daily_limit
    assert limits_payload["used_today"] >= 1
