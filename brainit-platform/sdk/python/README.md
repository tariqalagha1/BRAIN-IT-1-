# Brain it Python SDK

Simple Python client for Brain it Platform Phase 5.

## Requirements

- Python 3.10+
- requests
- Brain it Core reachable (default: http://127.0.0.1:18601)

## Install

Install dependency in your environment:

```bash
pip install -r sdk/python/requirements.txt
```

## Setup

```python
from brainit_client import BrainItClient

client = BrainItClient(
    base_url="http://127.0.0.1:18601",
    api_key="your-api-key"
)
```

## Usage

### Run task

```python
result = client.run_task(
    task_type="echo_transform",
    input_payload={"text": "hello python"}
)

print(result)
```

### Get task

```python
task = client.get_task("task-id")
print(task["status"])
```

### Get agents

```python
agents = client.get_agents()
print([agent["name"] for agent in agents])
```

### Wait for completion (polling helper)

```python
created = client.run_task(
    task_type="echo_transform",
    input_payload={"text": "poll me"}
)

completed = client.wait_for_completion(
    created["task_id"],
    interval_seconds=1.5,
    timeout_seconds=60.0,
)

print(completed["status"], completed.get("output_payload"))
```

## Error handling

The SDK raises `BrainItClientError` for:

- HTTP errors with status/details
- 401 unauthorized (invalid API key)
- network failures
- invalid JSON responses
- polling timeouts

Example:

```python
try:
    print(client.get_agents())
except Exception as exc:
    print(type(exc).__name__, getattr(exc, "status", None), str(exc))
```
