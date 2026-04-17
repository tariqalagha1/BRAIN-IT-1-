"""Final full-stack validation: frontend pages + A2A flow + rate limiting."""
import httpx, json

print("=== Frontend Page Checks ===")
pages = ["/", "/login", "/register", "/dashboard", "/billing", "/admin"]
for page in pages:
    r = httpx.get(f"http://localhost:3001{page}", follow_redirects=True, timeout=10)
    tag = "OK" if r.status_code == 200 else "FAIL"
    print(f"  [{tag}] {page:20} -> {r.status_code}")

print()
print("=== A2A Transform Flow ===")
# Create pro-plan API key
r_k = httpx.post(
    "http://127.0.0.1:8000/v1/api-keys",
    json={"client_name": "a2a-test", "plan_type": "pro", "tenant_id": "a2a-tenant"},
)
key = r_k.json().get("plaintext_key", "")
print(f"  API key created: {r_k.json().get('key_prefix')} plan={r_k.json().get('plan_type')}")

# echo_transform triggers A2A: echo_agent -> transform_agent
r_a2a = httpx.post(
    "http://127.0.0.1:8000/v1/orchestrate",
    json={"task_type": "echo_transform", "input_payload": {"text": "hello a2a"}},
    headers={"X-API-Key": key},
    timeout=15,
)
print(f"  POST /v1/orchestrate (echo_transform) -> {r_a2a.status_code}")
d = r_a2a.json()
task_id = d.get("task_id", "?")
status = d.get("status", "?")
agent = d.get("agent_used", "?")
steps = d.get("execution_steps", [])
a2a_calls = d.get("a2a_calls", [])
output = d.get("output_payload", {})
print(f"  task_id:           {task_id}")
print(f"  status:            {status}")
print(f"  agent_used:        {agent}")
print(f"  execution_steps:   {len(steps)}")
for s in steps:
    step_agent = s.get("agent", "?")
    step_num = s.get("step", "?")
    step_type = s.get("type", "?")
    print(f"    step {step_num}: {step_agent} ({step_type})")
print(f"  a2a_calls:         {len(a2a_calls)}")
for c in a2a_calls:
    print(f"    -> {c.get('to_agent','?')} status={c.get('status','?')}")
print(f"  output:            {json.dumps(output)[:150]}")

print()
print("=== Rate Limiting (plan=pro quota) ===")
limits_r = httpx.get("http://127.0.0.1:8000/v1/usage/limits", headers={"X-API-Key": key})
limits = limits_r.json()
print(f"  plan_type:      {limits.get('plan_type')}")
print(f"  daily_limit:    {limits.get('daily_limit')}")
print(f"  used_today:     {limits.get('used_today')}")
print(f"  remaining:      {limits.get('remaining_quota')}")

print()
print("=== CORS verify (frontend origin 3001 -> API 8000) ===")
cors_r = httpx.options(
    "http://127.0.0.1:8000/v1/api-keys",
    headers={"Origin": "http://localhost:3001", "Access-Control-Request-Method": "GET"},
)
print(f"  OPTIONS status: {cors_r.status_code}")
print(f"  allow-origin:   {cors_r.headers.get('access-control-allow-origin', 'MISSING')}")
print(f"  allow-methods:  {cors_r.headers.get('access-control-allow-methods', 'MISSING')}")
