import json
import sys
import time
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8000"
results = []


def req(method, path, body=None, headers=None):
    url = f"{BASE}{path}"
    data = json.dumps(body).encode() if body else None
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    try:
        r = urllib.request.urlopen(
            urllib.request.Request(url, data=data, headers=h, method=method),
            timeout=10,
        )
        return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try:
            body_err = json.loads(e.read())
        except Exception:
            body_err = {}
        return e.code, body_err
    except Exception as ex:
        return 0, {"error": str(ex)}


def check(label, passed, detail=""):
    icon = "PASS" if passed else "FAIL"
    results.append((icon, label, detail))
    suffix = f"  ->  {detail}" if detail else ""
    print(f"  [{icon}] {label}{suffix}")


# ---------------------------------------------------------------------------
# 0. Wait for services
# ---------------------------------------------------------------------------
print("\n" + "=" * 64)
print("  Brain it Platform -- QA Test Suite")
print("=" * 64)
print("\n[0] Waiting for services to be ready...")

for attempt in range(20):
    s, b = req("GET", "/health")
    if s == 200:
        print(f"    brainit-core READY (attempt {attempt + 1})")
        break
    time.sleep(2)
else:
    print("    brainit-core UNREACHABLE -- aborting")
    sys.exit(1)

for port, name in [(8001, "echo-agent"), (8002, "transform-agent")]:
    for attempt in range(12):
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=3)
            print(f"    {name} READY (attempt {attempt + 1})")
            break
        except Exception:
            time.sleep(2)
    else:
        print(f"    {name} UNREACHABLE")

# ---------------------------------------------------------------------------
# 1. Health
# ---------------------------------------------------------------------------
print("\n[1] Health checks")
s, b = req("GET", "/health")
check("GET /health -> 200", s == 200, f"status={s} service={b.get('service', '?')}")

# ---------------------------------------------------------------------------
# 2. Create API key
# ---------------------------------------------------------------------------
print("\n[2] Create API key")
s, b = req(
    "POST",
    "/v1/api-keys",
    {"client_name": "QA Test Client", "tenant_id": "qa-tenant", "plan_type": "free"},
)
check("POST /v1/api-keys -> 201", s == 201, f"status={s}")
if s != 201:
    print("    Cannot continue without API key -- aborting")
    sys.exit(1)

api_key_id = b["id"]
plaintext_key = b["plaintext_key"]
key_prefix = b["key_prefix"]
check("API key has plaintext_key", bool(plaintext_key), f"prefix={key_prefix}")
check("API key plan_type=free", b.get("plan_type") == "free", b.get("plan_type"))
check("API key is_active=true", b.get("is_active") is True)

AUTH = {"X-API-Key": plaintext_key}

# ---------------------------------------------------------------------------
# 3. List API keys (now requires auth)
# ---------------------------------------------------------------------------
print("\n[3] List API keys")
s, b2 = req("GET", "/v1/api-keys", headers=AUTH)
check("GET /v1/api-keys -> 200", s == 200, f"status={s} count={len(b2)}")
check("Created key visible in list", any(k["id"] == api_key_id for k in b2))

s_unauth, _ = req("GET", "/v1/api-keys")
check("GET /v1/api-keys without key -> 401", s_unauth == 401, f"status={s_unauth}")

# ---------------------------------------------------------------------------
# 4. Run tasks (echo + transform) — pass API key so usage is tracked
# ---------------------------------------------------------------------------
print("\n[4] Run tasks")
s, t_echo = req("POST", "/v1/orchestrate", {"task_type": "echo", "input_payload": {"text": "qa-echo-test"}}, headers=AUTH)
check("POST /v1/orchestrate echo -> 200/201", s in (200, 201), f"status={s}")
check("echo task_id present", bool(t_echo.get("task_id")))
check("echo status not failed", t_echo.get("status") != "failed", t_echo.get("status"))

s, t_xf = req("POST", "/v1/orchestrate", {"task_type": "transform", "input_payload": {"text": "qa-transform-test"}}, headers=AUTH)
check("POST /v1/orchestrate transform -> 200/201", s in (200, 201), f"status={s}")
check("transform task_id present", bool(t_xf.get("task_id")))

# ---------------------------------------------------------------------------
# 5. A2A echo_transform
# ---------------------------------------------------------------------------
print("\n[5] A2A echo_transform flow")
s, t_a2a = req("POST", "/v1/orchestrate", {"task_type": "echo_transform", "input_payload": {"text": "hello world"}}, headers=AUTH)
check("POST echo_transform -> 200/201", s in (200, 201), f"status={s}")
a2a_task_id = t_a2a.get("task_id", "")
check("echo_transform task_id present", bool(a2a_task_id))

t_detail = {}
for _ in range(14):
    s2, t_detail = req("GET", f"/v1/tasks/{a2a_task_id}")
    if t_detail.get("status") in ("completed", "failed"):
        break
    time.sleep(1.5)

check(
    "echo_transform status=completed",
    t_detail.get("status") == "completed",
    t_detail.get("status"),
)
steps = t_detail.get("execution_steps") or []
calls = t_detail.get("a2a_calls") or []
output = t_detail.get("output_payload") or {}
check("execution_steps present (>=2)", len(steps) >= 2, f"count={len(steps)}")
check("a2a_calls present (>=1)", len(calls) >= 1, f"count={len(calls)}")
result_text = (
    output.get("result")
    or output.get("transformed")
    or output.get("transformed_text")
    or output.get("echo")
    or ""
)
check("output_payload has result text", bool(str(result_text).strip()), str(result_text)[:80])

# ---------------------------------------------------------------------------
# 6. Task detail endpoint
# ---------------------------------------------------------------------------
print("\n[6] Task detail endpoint")
echo_id = t_echo.get("task_id", "")
s, td = req("GET", f"/v1/tasks/{echo_id}")
check("GET /v1/tasks/{id} -> 200", s == 200, f"status={s}")
check("task_type=echo in response", td.get("task_type") == "echo")
check("input_payload present", bool(td.get("input_payload")))

# ---------------------------------------------------------------------------
# 7. Failure tests
# ---------------------------------------------------------------------------
print("\n[7] Failure / auth tests")
s, b = req("GET", "/v1/usage")
check("GET /v1/usage without key -> 401/403", s in (401, 403), f"status={s}")

s, b = req("GET", "/v1/usage", headers={"X-API-Key": "invalid-key-000000"})
check("GET /v1/usage invalid key -> 401", s == 401, f"status={s} detail={b.get('detail','')}")

s, b = req("GET", "/v1/usage/limits", headers={"X-API-Key": "bad-key"})
check("GET /v1/usage/limits invalid key -> 401", s == 401, f"status={s}")

# health returns enriched metadata
s, health_body = req("GET", "/health")
check("/health has service field", health_body.get("service") == "brainit-core", health_body.get("service"))
check("/health has version field", health_body.get("version") == "v1", health_body.get("version"))
check("/health has db field", health_body.get("db") == "ok", health_body.get("db"))

# ---------------------------------------------------------------------------
# 8. Usage tracking
# ---------------------------------------------------------------------------
print("\n[8] Usage tracking")
s, usage = req("GET", "/v1/usage", headers=AUTH)
check("GET /v1/usage with valid key -> 200", s == 200, f"status={s}")
check(
    "total_tasks > 0 after running tasks",
    (usage.get("total_tasks") or 0) > 0,
    f"total_tasks={usage.get('total_tasks')}",
)
check("tasks_today > 0", (usage.get("tasks_today") or 0) > 0, f"tasks_today={usage.get('tasks_today')}")

s, limits = req("GET", "/v1/usage/limits", headers=AUTH)
check("GET /v1/usage/limits with valid key -> 200", s == 200, f"status={s}")
check("plan_type present in limits", bool(limits.get("plan_type")), limits.get("plan_type"))
check("remaining_quota field present", "remaining_quota" in limits, str(limits.get("remaining_quota")))

# ---------------------------------------------------------------------------
# 9. Registry + agents
# ---------------------------------------------------------------------------
print("\n[9] Agent registry")
s, reg = req("GET", "/v1/registry/agents")
check("GET /v1/registry/agents -> 200", s == 200, f"status={s}")
check("Registry has agents", len(reg) > 0, f"count={len(reg)}")
names = [a.get("name", "") for a in reg]
check("echo agent in registry", any("echo" in n.lower() for n in names), str(names))
check("transform agent in registry", any("transform" in n.lower() for n in names), str(names))

s, agents = req("GET", "/v1/agents")
check("GET /v1/agents -> 200", s == 200, f"status={s} count={len(agents)}")

# ---------------------------------------------------------------------------
# 10. Disable API key + verify rejection
# ---------------------------------------------------------------------------
print("\n[10] API key disable")
s, disabled = req("POST", f"/v1/api-keys/{api_key_id}/disable", headers=AUTH)
check("POST /v1/api-keys/{id}/disable -> 200", s == 200, f"status={s}")
check("API key is_active=false after disable", disabled.get("is_active") is False)

s, b = req("GET", "/v1/usage", headers=AUTH)
check("Disabled key -> 401 on /v1/usage", s in (401, 403), f"status={s}")

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
passed_list = [r for r in results if r[0] == "PASS"]
failed_list = [r for r in results if r[0] == "FAIL"]

print("\n" + "=" * 64)
print(f"  RESULTS:  {len(passed_list)} PASSED  |  {len(failed_list)} FAILED")
print("=" * 64)
if failed_list:
    print("\n  FAILED TESTS:")
    for _, label, detail in failed_list:
        print(f"    x {label}  ({detail})")
else:
    print("\n  All tests passed.")
print()
