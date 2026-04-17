# Brain it JavaScript SDK

Simple JavaScript client for Brain it Platform Phase 5.

## Requirements

- Node.js 18+ (fetch API available)
- Brain it Core reachable (default: http://127.0.0.1:18601)

## Install

No package publishing is required for this phase.
Use it as a local module from this repository.

## Setup

```javascript
import { BrainItClient } from "../../sdk/js/index.js";

const client = new BrainItClient({
  baseUrl: "http://127.0.0.1:18601",
  apiKey: "your-api-key"
});
```

## Usage

### Run task

```javascript
const result = await client.runTask({
  task_type: "echo_transform",
  input_payload: { text: "hello sdk" }
});

console.log(result);
```

### Get task

```javascript
const task = await client.getTask("task-id");
console.log(task.status);
```

### Get agents

```javascript
const agents = await client.getAgents();
console.log(agents.map((a) => a.name));
```

### Wait for completion (polling helper)

```javascript
const created = await client.runTask({
  task_type: "echo_transform",
  input_payload: { text: "poll me" }
});

const completed = await client.waitForCompletion(created.task_id, {
  intervalMs: 1500,
  timeoutMs: 60000
});

console.log(completed.status, completed.output_payload);
```

## Error handling

The SDK throws `BrainItClientError` for:

- HTTP errors with status and details
- 401 unauthorized (invalid API key)
- network failures
- invalid JSON responses
- timeouts

Example:

```javascript
try {
  await client.getAgents();
} catch (error) {
  console.error(error.name, error.status, error.message);
}
```
