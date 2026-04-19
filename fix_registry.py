import json
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8000"


def req(method, path, body=None):
    data = json.dumps(body).encode() if body else None
    h = {"Content-Type": "application/json"}
    try:
        r = urllib.request.urlopen(
            urllib.request.Request(BASE + path, data=data, headers=h, method=method),
            timeout=8,
        )
        return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())
    except Exception as ex:
        return 0, {"error": str(ex)}


# List current agents
s, agents = req("GET", "/v1/registry/agents")
print(f"GET /v1/registry/agents -> {s} ({len(agents)} agents)")
for a in agents:
    print(f"  {a['name']} | run_url={a.get('run_url')} | base_url={a.get('base_url')}")

# Correct local-dev URLs
url_map = {
    "echo_agent": "http://127.0.0.1:8001",
    "transform_agent": "http://127.0.0.1:8002",
}

print("\nUpdating agent URLs...")
for a in agents:
    if a["name"] in url_map:
        base = url_map[a["name"]]
        payload = {
            "base_url": base,
            "card_url": f"{base}/a2a/card",
            "run_url": f"{base}/a2a/run",
            "health_url": f"{base}/health",
        }
        s2, r2 = req("PUT", f"/v1/registry/agents/{a['id']}", payload)
        print(f"  {a['name']} -> HTTP {s2}: run_url={r2.get('run_url')}")

print("\nDone.")
