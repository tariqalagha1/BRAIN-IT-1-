from app.services.agent_http_client import AgentHttpClient


def test_get_task_persists_status(client, monkeypatch):
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

    create = client.post(
        "/v1/orchestrate",
        json={"task_type": "echo", "input_payload": {"text": "persist me"}},
    )
    assert create.status_code == 200
    task_id = create.json()["task_id"]

    response = client.get(f"/v1/tasks/{task_id}")
    assert response.status_code == 200

    payload = response.json()
    assert payload["task_id"] == task_id
    assert payload["task_type"] == "echo"
    assert payload["status"] == "completed"
    assert payload["agent_used"] == "echo_agent"
    assert payload["input_payload"]["text"] == "persist me"
    assert payload["output_payload"]["echo"] == "persist me"
    assert payload["execution_steps"][0]["agent"] == "echo_agent"
    assert payload["a2a_calls"] == []
    assert payload["error_message"] is None
