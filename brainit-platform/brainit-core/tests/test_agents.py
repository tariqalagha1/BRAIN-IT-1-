from app.services.agent_http_client import AgentHttpClient


def test_list_agents(client):
    response = client.get("/v1/agents")
    assert response.status_code == 200

    payload = response.json()
    assert isinstance(payload, list)
    assert len(payload) == 2
    assert payload[0]["name"] == "echo_agent"
    assert payload[1]["name"] == "transform_agent"
    assert "echo_transform" in payload[0]["supported_task_types"]


def test_echo_agent_card_endpoint(client, monkeypatch):
    def fake_fetch_card(self, agent):
        return {
            "name": "echo_agent",
            "description": "Echoes input text and optionally delegates transformation",
            "version": "0.3.0",
            "supported_task_types": ["echo", "echo_transform"],
            "endpoint": "/a2a/run",
            "downstream_agents": ["transform_agent"],
            "auth_scheme": "none",
            "health_url": "/health",
        }

    monkeypatch.setattr(AgentHttpClient, "fetch_card", fake_fetch_card)

    response = client.get("/a2a/agents/echo/card")
    assert response.status_code == 200

    payload = response.json()
    assert payload["name"] == "echo_agent"
    assert payload["endpoint"] == "/a2a/run"
    assert payload["downstream_agents"] == ["transform_agent"]


def test_direct_a2a_echo_run(client, monkeypatch):
    def fake_run_agent(self, agent, payload):
        return {
            "output": {"echo": payload["text"], "agent": "echo_agent"},
            "execution_steps": [{"step": 1, "agent": "echo_agent", "status": "completed"}],
            "a2a_calls": [],
        }

    monkeypatch.setattr(AgentHttpClient, "run_agent", fake_run_agent)

    response = client.post("/a2a/agents/echo/run", json={"task_type": "echo", "text": "hello"})
    assert response.status_code == 200

    payload = response.json()
    assert payload["output"]["echo"] == "hello"
    assert payload["output"]["agent"] == "echo_agent"
    assert payload["execution_steps"][0]["agent"] == "echo_agent"
