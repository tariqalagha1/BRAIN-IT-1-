def test_list_agents(client):
    response = client.get("/v1/agents")
    assert response.status_code == 200

    payload = response.json()
    assert isinstance(payload, list)
    assert len(payload) == 1
    assert payload[0]["name"] == "echo_agent"
    assert payload[0]["supported_task_types"] == ["echo"]


def test_echo_agent_card_endpoint(client):
    response = client.get("/a2a/agents/echo/card")
    assert response.status_code == 200

    payload = response.json()
    assert payload["name"] == "echo_agent"
    assert payload["endpoint"] == "/a2a/agents/echo/run"


def test_direct_a2a_echo_run(client):
    response = client.post("/a2a/agents/echo/run", json={"text": "hello"})
    assert response.status_code == 200

    payload = response.json()
    assert payload["echo"] == "hello"
    assert payload["agent"] == "echo_agent"
