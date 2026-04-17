import httpx, json
r = httpx.get("http://127.0.0.1:8000/openapi.json")
spec = r.json()

print("=== /v1/orchestrate POST ===")
orch = spec["paths"]["/v1/orchestrate"]["post"]
body_ref = orch.get("requestBody", {}).get("content", {}).get("application/json", {}).get("schema", {})
ref_key = body_ref.get("$ref", "").split("/")[-1]
if ref_key:
    print(json.dumps(spec["components"]["schemas"][ref_key], indent=2))

print()
print("=== /v1/usage GET security/params ===")
u = spec["paths"]["/v1/usage"]["get"]
print("security:", json.dumps(u.get("security", []), indent=2))
print("parameters:", json.dumps(u.get("parameters", []), indent=2))
for dep in u.get("dependencies", []):
    print("dep:", dep)
