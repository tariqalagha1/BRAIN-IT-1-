from fastapi.testclient import TestClient

from app.main import app


def test_health_check():
    with TestClient(app) as client:
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


def test_auth_flow_and_protected_routes():
    with TestClient(app) as client:
        payload = {"full_name": "Test User", "email": "test@example.com", "password": "Password123"}
        register_response = client.post("/api/auth/register", json=payload)
        assert register_response.status_code in (201, 409)

        login_response = client.post("/api/auth/login", json={"email": payload["email"], "password": payload["password"]})
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        me_response = client.get("/api/auth/me", headers=headers)
        assert me_response.status_code == 200
        assert me_response.json()["email"] == payload["email"]

        dashboard_response = client.get("/api/dashboard/summary", headers=headers)
        assert dashboard_response.status_code == 200

        billing_response = client.get("/api/billing/summary", headers=headers)
        assert billing_response.status_code == 200
