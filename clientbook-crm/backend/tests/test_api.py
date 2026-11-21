"""Integration tests. Need a Postgres with database/schema.sql applied (use a Neon branch).
Set TEST_DATABASE_URL to run; otherwise the tests are skipped."""
import os
import uuid

import pytest

if os.getenv("TEST_DATABASE_URL"):
    os.environ["DATABASE_URL"] = os.environ["TEST_DATABASE_URL"]
os.environ.setdefault("JWT_SECRET", "test-secret-" + "x" * 40)
os.environ["ALLOW_REGISTRATION"] = "true"

pytestmark = pytest.mark.skipif(not os.getenv("TEST_DATABASE_URL"), reason="TEST_DATABASE_URL not set")


@pytest.fixture(scope="module")
def client():
    from fastapi.testclient import TestClient
    from crm.main import app
    return TestClient(app)


def signup(client, role_name="Owner"):
    email = f"{uuid.uuid4().hex[:10]}@test.example"
    r = client.post("/api/auth/register", json={"org_name": "Org " + email, "name": role_name, "email": email, "password": "correct-horse-1"})
    assert r.status_code == 201, r.text
    body = r.json()
    return {"Authorization": f"Bearer {body['access_token']}"}, body["user"], email


def test_auth_flow(client):
    h, user, email = signup(client)
    assert client.get("/api/auth/me", headers=h).json()["email"] == email
    assert client.get("/api/auth/me").status_code == 401
    assert client.post("/api/auth/login", json={"email": email, "password": "wrong-password"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": email, "password": "correct-horse-1"}).status_code == 200
    assert client.post("/api/auth/register", json={"org_name": "X", "name": "Y", "email": email, "password": "correct-horse-1"}).status_code == 409


def test_validation(client):
    h, _, _ = signup(client)
    assert client.post("/api/customers", json={"name": "A", "email": "not-an-email"}, headers=h).status_code == 422
    assert client.post("/api/customers", json={"name": ""}, headers=h).status_code == 422
    assert client.post("/api/deals", json={"title": "D", "value": -5}, headers=h).status_code == 422
    assert client.post("/api/deals", json={"title": "D", "stage": "bogus"}, headers=h).status_code == 422
    assert client.get("/api/customers?owner_id=abc", headers=h).status_code == 422


def test_tenant_isolation(client):
    ha, ua, _ = signup(client)
    hb, ub, _ = signup(client)
    cust = client.post("/api/customers", json={"name": "Secret Co"}, headers=ha).json()
    deal = client.post("/api/deals", json={"title": "Secret deal", "customer_id": cust["id"]}, headers=ha).json()
    task = client.post("/api/tasks", json={"title": "Secret task"}, headers=ha).json()
    for path in (f"/api/customers/{cust['id']}", f"/api/deals/{deal['id']}", f"/api/tasks/{task['id']}"):
        assert client.get(path, headers=hb).status_code == 404
        assert client.delete(path, headers=hb).status_code == 404
    assert client.put(f"/api/customers/{cust['id']}", json={"name": "Hacked"}, headers=hb).status_code == 404
    assert client.get("/api/customers", headers=hb).json()["total"] == 0
    assert client.get(f"/api/customers/{cust['id']}", headers=ha).json()["name"] == "Secret Co"
    # cross-tenant references are rejected
    assert client.post("/api/deals", json={"title": "x", "customer_id": cust["id"]}, headers=hb).status_code == 422
    assert client.post("/api/tasks", json={"title": "x", "assigned_to": ua["id"]}, headers=hb).status_code == 422
    assert client.post("/api/activities", json={"type": "note", "subject": "x", "customer_id": cust["id"]}, headers=hb).status_code == 422
    assert client.put(f"/api/users/{ua['id']}", json={"name": "x", "role": "admin", "is_active": True}, headers=hb).status_code == 404
    assert {x["id"] for x in client.get("/api/users", headers=hb).json()} == {ub["id"]}


def test_roles(client):
    h, _, _ = signup(client)
    email = f"{uuid.uuid4().hex[:10]}@test.example"
    r = client.post("/api/users", json={"name": "Emp", "email": email, "password": "employee-pass-1", "role": "employee"}, headers=h)
    assert r.status_code == 201
    eh = {"Authorization": "Bearer " + client.post("/api/auth/login", json={"email": email, "password": "employee-pass-1"}).json()["access_token"]}
    cust = client.post("/api/customers", json={"name": "Made by employee"}, headers=eh)
    assert cust.status_code == 201
    cid = cust.json()["id"]
    assert client.delete(f"/api/customers/{cid}", headers=eh).status_code == 403
    assert client.post("/api/users", json={"name": "x", "email": "x@y.example", "password": "password-123"}, headers=eh).status_code == 403
    assert client.delete(f"/api/customers/{cid}", headers=h).status_code == 204


def test_crud_search_pagination(client):
    h, _, _ = signup(client)
    for n in ("Alpha", "Beta", "Gamma"):
        assert client.post("/api/customers", json={"name": n, "tags": ["vip", "vip", " "]}, headers=h).status_code == 201
    page = client.get("/api/customers?page_size=2", headers=h).json()
    assert page["total"] == 3 and len(page["items"]) == 2
    assert client.get("/api/customers?q=bet", headers=h).json()["total"] == 1
    assert client.get("/api/customers?tag=vip", headers=h).json()["total"] == 3
    assert client.get("/api/customers?page_size=2", headers=h).json()["items"][0]["tags"] == ["vip"]


def test_lead_convert_deal_and_task_flow(client):
    h, _, _ = signup(client)
    lead = client.post("/api/leads", json={"name": "Lee", "email": "lee@x.example", "source": "Website"}, headers=h).json()
    c = client.post(f"/api/leads/{lead['id']}/convert", headers=h)
    assert c.status_code == 201
    assert client.post(f"/api/leads/{lead['id']}/convert", headers=h).status_code == 409
    assert client.get(f"/api/leads/{lead['id']}", headers=h).json()["status"] == "converted"
    deal = client.post("/api/deals", json={"title": "D", "value": 100.5, "customer_id": c.json()["id"]}, headers=h).json()
    won = client.patch(f"/api/deals/{deal['id']}/stage", json={"stage": "won"}, headers=h).json()
    assert won["closed_at"] is not None
    assert client.patch(f"/api/deals/{deal['id']}/stage", json={"stage": "new"}, headers=h).json()["closed_at"] is None
    task = client.post("/api/tasks", json={"title": "T"}, headers=h).json()
    assert client.post(f"/api/tasks/{task['id']}/toggle", headers=h).json()["status"] == "done"
    dash = client.get("/api/dashboard", headers=h).json()
    assert dash["stats"]["customers"] == 1 and len(dash["revenue_by_month"]) == 6 and len(dash["pipeline"]) == 6
