from app.config import get_settings
from app.services.agent_http_client import AgentHttpClient


def test_registry_seed_works(client):
    response = client.get("/v1/registry/agents")
    assert response.status_code == 200

    payload = response.json()
    names = [agent["name"] for agent in payload]
    assert "echo_agent" in names
    assert "transform_agent" in names


def test_register_agent_works(client):
    response = client.post(
        "/v1/registry/agents",
        json={
            "name": "custom_agent",
            "description": "Custom platform agent",
            "version": "1.0.0",
            "base_url": "http://127.0.0.1:19991",
            "card_url": "http://127.0.0.1:19991/a2a/card",
            "run_url": "http://127.0.0.1:19991/a2a/run",
            "health_url": "http://127.0.0.1:19991/health",
            "supported_task_types": ["custom"],
            "downstream_agents": [],
            "status": "configured",
            "is_enabled": True,
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["name"] == "custom_agent"
    assert payload["supported_task_types"] == ["custom"]


def test_duplicate_agent_name_fails(client):
    response = client.post(
        "/v1/registry/agents",
        json={
            "name": "echo_agent",
            "description": "Duplicate echo",
            "version": "1.0.0",
            "base_url": "http://127.0.0.1:19992",
            "card_url": "http://127.0.0.1:19992/a2a/card",
            "run_url": "http://127.0.0.1:19992/a2a/run",
            "health_url": "http://127.0.0.1:19992/health",
            "supported_task_types": ["echo"],
            "downstream_agents": [],
            "status": "configured",
            "is_enabled": True,
        },
    )

    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_disabled_agent_not_selected(client):
    agents = client.get("/v1/registry/agents").json()
    echo_agent = next(agent for agent in agents if agent["name"] == "echo_agent")

    disable_response = client.post(f"/v1/registry/agents/{echo_agent['id']}/disable")
    assert disable_response.status_code == 200
    assert disable_response.json()["is_enabled"] is False

    response = client.post(
        "/v1/orchestrate",
        json={"task_type": "echo", "input_payload": {"text": "hello"}},
    )

    assert response.status_code == 400
    assert "Unsupported task type: echo" in response.json()["detail"]


def test_health_check_updates_status(client, monkeypatch):
    agents = client.get("/v1/registry/agents").json()
    echo_agent = next(agent for agent in agents if agent["name"] == "echo_agent")

    class DummyResponse:
        def raise_for_status(self) -> None:
            return None

    def fake_get(self, url):
        return DummyResponse()

    monkeypatch.setattr("httpx.Client.get", fake_get)

    response = client.post(f"/v1/registry/agents/{echo_agent['id']}/health-check")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "healthy"
    assert payload["last_health_check_at"] is not None
