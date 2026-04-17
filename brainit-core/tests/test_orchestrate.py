def test_orchestrate_echo_task(client):
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


def test_orchestrate_unsupported_task_type_returns_error(client):
    response = client.post(
        "/v1/orchestrate",
        json={"task_type": "unknown", "input_payload": {"text": "hello"}},
    )

    assert response.status_code == 400
    assert "Unsupported task type" in response.json()["detail"]
