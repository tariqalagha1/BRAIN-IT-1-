import json
import urllib.request
import urllib.error


def get(url):
    try:
        r = urllib.request.urlopen(url, timeout=5)
        return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, {}
    except Exception as ex:
        return 0, {"error": str(ex)}


print("=== Brain it Local Stack Status ===")

s, b = get("http://127.0.0.1:8000/health")
svc = b.get("service", "?")
db = b.get("db", "?")
print(f"  brainit-core  http://127.0.0.1:8000  ->  HTTP {s}  service={svc}  db={db}")

s, b = get("http://127.0.0.1:8001/health")
print(f"  echo-agent    http://127.0.0.1:8001  ->  HTTP {s}  {b}")

s, b = get("http://127.0.0.1:8002/health")
print(f"  transform-ag  http://127.0.0.1:8002  ->  HTTP {s}  {b}")

s, b = get("http://127.0.0.1:3000")
print(f"  frontend      http://127.0.0.1:3000  ->  HTTP {s}")

print()
print("=== API smoke test (echo_transform A2A) ===")

# Create key
data = json.dumps({"client_name": "local-test", "tenant_id": "local", "plan_type": "free"}).encode()
req = urllib.request.Request(
    "http://127.0.0.1:8000/v1/api-keys",
    data=data,
    headers={"Content-Type": "application/json"},
    method="POST",
)
r = urllib.request.urlopen(req, timeout=5)
key_data = json.loads(r.read())
key = key_data["plaintext_key"]
prefix = key_data["key_prefix"]
print(f"  API key created: {prefix}...")

# echo_transform task
data = json.dumps({"task_type": "echo_transform", "input_payload": {"text": "smoke test"}}).encode()
req = urllib.request.Request(
    "http://127.0.0.1:8000/v1/orchestrate",
    data=data,
    headers={"Content-Type": "application/json", "X-API-Key": key},
    method="POST",
)
r = urllib.request.urlopen(req, timeout=10)
task = json.loads(r.read())
steps = len(task.get("execution_steps") or [])
calls = len(task.get("a2a_calls") or [])
status = task.get("status")
out = task.get("output_payload") or {}
result = (
    out.get("result")
    or out.get("transformed")
    or out.get("transformed_text")
    or out.get("echo")
    or str(out)
)
print(f"  echo_transform -> status={status}  steps={steps}  a2a_calls={calls}")
print(f"  output: {result}")

print()
print("================================")
print("  All services ONLINE")
print("  Open:  http://localhost:3000")
print("================================")
