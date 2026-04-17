# Brain it Core - Phase 1

Brain it Core is a standalone backend orchestration service built for task-first execution.

This Phase 1 service proves the core platform flow:

client request -> task persisted -> orchestrator selects agent -> agent executes -> task status updated -> result returned

## Phase 1 scope

Implemented in this phase:

- Task orchestration endpoint
- Task retrieval endpoint
- Static agent registry endpoint
- Health endpoint
- One working agent (`echo_agent`)
- Minimal A2A foundation endpoints:
  - Agent card endpoint
  - Agent run endpoint

Intentionally NOT implemented in this phase:

- Frontend
- Authentication/RBAC
- Billing/admin/dashboard features
- Multi-tenant management
- Redis/Celery/background queue
- Full A2A protocol operations
- Dynamic discovery registry
- LLM routing
- External model integrations

## Project structure

```
brainit-core/
  app/
    main.py
    config.py
    database.py
    models/
      task.py
    schemas/
      task.py
      agent.py
    api/
      routes/
        health.py
        orchestrate.py
        tasks.py
        agents.py
        a2a.py
    services/
      orchestrator.py
      task_service.py
    agents/
      registry.py
      base.py
      echo_agent.py
    core/
      logging.py
      errors.py
  tests/
    test_health.py
    test_tasks.py
    test_orchestrate.py
    test_agents.py
  requirements.txt
  .env.example
  README.md
```

## Run locally

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Copy env template:

```bash
cp .env.example .env
```

4. Start API:

```bash
uvicorn app.main:app --reload
```

Base URL: `http://localhost:8000`

## Endpoints

- `GET /health`
- `POST /v1/orchestrate`
- `GET /v1/tasks/{task_id}`
- `GET /v1/agents`
- `GET /a2a/agents/echo/card`
- `POST /a2a/agents/echo/run`

## Example requests

### POST /v1/orchestrate

Request:

```json
{
  "task_type": "echo",
  "input_payload": {
    "text": "hello"
  }
}
```

Response:

```json
{
  "task_id": "...",
  "status": "completed",
  "agent_used": "echo_agent",
  "output_payload": {
    "echo": "hello",
    "agent": "echo_agent",
    "metadata": {
      "timestamp": "..."
    }
  }
}
```

### GET /v1/tasks/{task_id}

Returns persisted task details and status lifecycle fields.

### GET /v1/agents

Returns static registry entries, including the `echo_agent` card.

### GET /a2a/agents/echo/card

Returns the minimal agent card for `echo_agent`.

### POST /a2a/agents/echo/run

Request:

```json
{
  "text": "hello"
}
```

Response:

```json
{
  "echo": "hello",
  "agent": "echo_agent",
  "metadata": {
    "timestamp": "..."
  }
}
```

## Tests

Run tests with:

```bash
pytest -q
```
