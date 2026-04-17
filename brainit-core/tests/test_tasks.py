def test_get_task_persists_status(client):
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
    assert payload["error_message"] is None
