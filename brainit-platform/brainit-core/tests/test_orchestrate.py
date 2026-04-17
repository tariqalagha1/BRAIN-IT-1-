from app.core.errors import AgentServiceError
from app.services.agent_http_client import AgentHttpClient


def test_orchestrate_echo_task(client, monkeypatch):
    def fake_run_agent(self, agent, payload):
        return {
            "output": {"echo": payload["text"], "agent": agent.name},
            "execution_steps": [
                {
                    "step": 1,
                    "agent": "echo_agent",
                    "service": "echo-agent-service",
                    "status": "completed",
                }
            ],
            "a2a_calls": [],
        }

    monkeypatch.setattr(AgentHttpClient, "run_agent", fake_run_agent)

    response = client.post(
        "/v1/orchestrate",
        json={"task_type": "echo", "input_payload": {"text": "hello"}},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "completed"
    assert payload["agent_used"] == "echo_agent"
    assert payload["output_payload"]["echo"] == "hello"
    assert payload["output_payload"]["agent"] == "echo_agent"
    assert payload["execution_steps"][0]["agent"] == "echo_agent"
    assert payload["a2a_calls"] == []


def test_orchestrate_unsupported_task_type_returns_error(client):
    response = client.post(
        "/v1/orchestrate",
        json={"task_type": "unknown", "input_payload": {"text": "hello"}},
    )

    assert response.status_code == 400
    assert "Unsupported task type" in response.json()["detail"]


def test_orchestrate_echo_transform_failure_persists_trace(client, monkeypatch):
    def fake_run_agent(self, agent, payload):
        raise AgentServiceError(
            "Remote error from echo_agent",
            execution_steps=[
                {
                    "step": 1,
                    "agent": "echo_agent",
                    "service": "echo-agent-service",
                    "status": "completed",
                },
                {
                    "step": 2,
                    "agent": "transform_agent",
                    "service": "transform-agent-service",
                    "status": "failed",
                },
            ],
            a2a_calls=[
                {
                    "from_agent": "echo_agent",
                    "to_agent": "transform_agent",
                    "status": "failed",
                }
            ],
        )

    monkeypatch.setattr(AgentHttpClient, "run_agent", fake_run_agent)

    response = client.post(
        "/v1/orchestrate",
        json={"task_type": "echo_transform", "input_payload": {"text": "hello"}},
    )

    assert response.status_code == 502
    assert "Remote error from echo_agent" in response.json()["detail"]
