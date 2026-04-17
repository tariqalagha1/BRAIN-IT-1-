# Brain it Platform - Phase 3

This folder contains the controlled distributed A2A setup:

- `brainit-core`: central orchestrator and task state owner
- `agents/echo-agent-service`: echo agent with optional downstream transform call
- `agents/transform-agent-service`: transform agent (uppercase)

## Architecture

The orchestrator in `brainit-core` remains the single source of truth for task state. Agent services execute work over HTTP and return structured traces.

Flow:

1. Client calls `POST /v1/orchestrate`
2. Core creates task (`pending`) and marks it `running`
3. Core selects target service by `task_type`
4. Core calls remote `/a2a/run`
5. Core stores `output_payload`, `execution_steps`, `a2a_calls`
6. Core marks task `completed` or `failed`

## Task types

- `echo` -> core -> echo-agent-service
- `transform` -> core -> transform-agent-service
- `echo_transform` -> core -> echo-agent-service -> transform-agent-service

## Local run

Use three terminals.

### 1) Start transform agent service

```bash
cd brainit-platform/agents/transform-agent-service
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 18621 --reload
```

### 2) Start echo agent service

```bash
cd brainit-platform/agents/echo-agent-service
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 18611 --reload
```

### 3) Start brainit core

```bash
cd brainit-platform/brainit-core
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 18601 --reload
```

## Quick checks

```bash
curl http://127.0.0.1:18601/health
curl http://127.0.0.1:18611/health
curl http://127.0.0.1:18621/health
```

```bash
curl -X POST http://127.0.0.1:18601/v1/orchestrate \\
  -H "Content-Type: application/json" \\
  -d '{"task_type":"echo_transform","input_payload":{"text":"clinicalmind"}}'
```

```bash
curl http://127.0.0.1:18601/v1/tasks/<task_id>
```

## Test core

Core tests mock HTTP calls and validate orchestration state logic:

```bash
cd brainit-platform/brainit-core
pytest -q
```
