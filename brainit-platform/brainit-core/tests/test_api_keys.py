from app.config import get_settings
from app.services.agent_http_client import AgentHttpClient


def test_api_key_creation_works(client):
    response = client.post(
        "/v1/api-keys",
        json={"client_name": "SDK Client", "tenant_id": "tenant-alpha", "plan_type": "pro"},
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["client_name"] == "SDK Client"
    assert payload["tenant_id"] == "tenant-alpha"
    assert payload["plan_type"] == "pro"
    assert payload["usage_limit"] is None
    assert payload["plaintext_key"].startswith("brainit_")
    assert payload["key_prefix"] == payload["plaintext_key"][:12]

    list_response = client.get("/v1/api-keys")
    assert list_response.status_code == 200
    listed = list_response.json()
    assert listed[0]["key_prefix"] == payload["key_prefix"]
    assert listed[0]["plan_type"] == "pro"
    assert "plaintext_key" not in listed[0]


def test_api_key_validation_and_orchestrate_store_client_metadata(client, monkeypatch):
    def fake_run_agent(self, agent, payload):
        return {
            "output": {"echo": payload["text"], "agent": agent.name},
            "execution_steps": [{"step": 1, "agent": agent.name, "service": "echo-agent-service", "status": "completed"}],
            "a2a_calls": [],
        }

    monkeypatch.setattr(AgentHttpClient, "run_agent", fake_run_agent)

    key_response = client.post(
        "/v1/api-keys",
        json={"client_name": "Platform SDK", "tenant_id": "tenant-beta", "plan_type": "free"},
    )
    plaintext_key = key_response.json()["plaintext_key"]

    settings = get_settings()
    original_require = settings.require_api_key
    settings.require_api_key = True
    try:
        response = client.post(
            "/v1/orchestrate",
            headers={"X-API-Key": plaintext_key},
            json={"task_type": "echo", "input_payload": {"text": "hello"}},
        )
    finally:
        settings.require_api_key = original_require

    assert response.status_code == 200
    task_id = response.json()["task_id"]

    task_response = client.get(f"/v1/tasks/{task_id}")
    assert task_response.status_code == 200
    task_payload = task_response.json()
    assert task_payload["client_name"] == "Platform SDK"
    assert task_payload["tenant_id"] == "tenant-beta"
    assert task_payload["created_by_api_key_id"] is not None
    assert task_payload["registry_snapshot"]["selected_agent"]["name"] == "echo_agent"


def test_inactive_api_key_fails_auth(client):
    key_response = client.post(
        "/v1/api-keys",
        json={"client_name": "Inactive Client", "tenant_id": "tenant-inactive", "plan_type": "free"},
    )
    key_payload = key_response.json()
    plaintext_key = key_payload["plaintext_key"]
    key_id = key_payload["id"]

    disable_response = client.post(f"/v1/api-keys/{key_id}/disable")
    assert disable_response.status_code == 200
    assert disable_response.json()["is_active"] is False

    settings = get_settings()
    original_require = settings.require_api_key
    settings.require_api_key = True
    try:
        response = client.post(
            "/v1/orchestrate",
            headers={"X-API-Key": plaintext_key},
            json={"task_type": "echo", "input_payload": {"text": "hello"}},
        )
    finally:
        settings.require_api_key = original_require

    assert response.status_code == 401
    assert "Invalid or inactive API key" in response.json()["detail"]
