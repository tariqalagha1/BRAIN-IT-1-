"""
Phase 7 endpoint validation script.
Run from brainit-platform/brainit-core with:
  python validate_endpoints.py
"""
import httpx

BASE = "http://127.0.0.1:8000"

def check(label, r):
    status = "✅" if r.status_code < 400 else "❌"
    print(f"{status}  {label} -> {r.status_code}: {r.text[:200]}")
    return r

print("=" * 60)
print("Phase 7 Live Endpoint Validation")
print("=" * 60)

# 1 — health
check("GET  /health                  ", httpx.get(f"{BASE}/health"))

# 2 — api-keys list (no auth needed)
check("GET  /v1/api-keys             ", httpx.get(f"{BASE}/v1/api-keys"))

# 3 — create API key
r = httpx.post(
    f"{BASE}/v1/api-keys",
    json={"client_name": "phase7-validation", "plan_type": "free", "tenant_id": "validation-tenant"},
)
check("POST /v1/api-keys             ", r)
key = r.json().get("plaintext_key", "") if r.status_code == 201 else ""
print(f"     key_prefix={r.json().get('key_prefix')}  plan={r.json().get('plan_type')}")

# 4 — usage (authenticated)
check("GET  /v1/usage (with key)     ", httpx.get(f"{BASE}/v1/usage", headers={"X-API-Key": key}))

# 5 — usage/limits (authenticated)
check("GET  /v1/usage/limits         ", httpx.get(f"{BASE}/v1/usage/limits", headers={"X-API-Key": key}))

# 6 — registry agents
check("GET  /v1/registry/agents      ", httpx.get(f"{BASE}/v1/registry/agents"))

# 7 — orchestrate (input_payload is a dict; agents offline → expect 500/503 or task record)
orch_r = httpx.post(
    f"{BASE}/v1/orchestrate",
    json={"task_type": "echo", "input_payload": {"text": "hello phase7"}},
    headers={"X-API-Key": key},
    timeout=12,
)
check("POST /v1/orchestrate          ", orch_r)

# 8 — retrieve the task created by orchestrate (no list endpoint; use task_id from response)
orch_data = orch_r.json() if orch_r.status_code in (200, 201, 500, 503) else {}
task_id = orch_data.get("task_id") or orch_data.get("id")
if task_id:
    check(f"GET  /v1/tasks/{task_id[:8]}... ", httpx.get(f"{BASE}/v1/tasks/{task_id}"))
else:
    print("     (no task_id in orchestrate response, skipping task lookup)")

# 9 — A2A card (agent-to-agent flow registration)
check("GET  /a2a/agents/echo/card    ", httpx.get(f"{BASE}/a2a/agents/echo/card", timeout=5))

# 10 — usage unauthenticated (should 401)
r_unauth = httpx.get(f"{BASE}/v1/usage")
check("GET  /v1/usage (no key→401)  ", r_unauth)

print("=" * 60)
print("Validation complete.")
