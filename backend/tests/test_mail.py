import os
import uuid

import pytest
from test_api import signup  # noqa: F401

pytestmark = pytest.mark.skipif(not os.getenv("TEST_DATABASE_URL"), reason="TEST_DATABASE_URL not set")


@pytest.fixture(scope="module")
def client():
    from fastapi.testclient import TestClient
    from crm.main import app
    return TestClient(app)


def test_assignment_emails(client, monkeypatch):
    import crm.mail as mail
    sent = []
    monkeypatch.setattr(mail, "send_email", lambda to, subject, text, html_body=None: sent.append((to, subject, text)) or True)
    h, admin, _ = signup(client)
    email = f"{uuid.uuid4().hex[:10]}@test.example"
    emp = client.post("/api/users", json={"name": "Emp", "email": email, "password": "employee-pass-1"}, headers=h).json()
    assert len(sent) == 1 and sent[0][0] == email and "employee-pass-1" in sent[0][2]  # welcome email
    sent.clear()

    t = client.post("/api/tasks", json={"title": "Call Bob", "assigned_to": emp["id"]}, headers=h).json()
    assert len(sent) == 1 and sent[0][0] == email and "Call Bob" in sent[0][1]
    client.put(f"/api/tasks/{t['id']}", json={"title": "Call Bob", "assigned_to": emp["id"], "priority": "high"}, headers=h)
    assert len(sent) == 1  # assignee unchanged: no email
    client.post("/api/tasks", json={"title": "Mine", "assigned_to": admin["id"]}, headers=h)
    assert len(sent) == 1  # self-assignment: no email
    client.post("/api/leads", json={"name": "Lee", "assigned_to": emp["id"]}, headers=h)
    client.post("/api/deals", json={"title": "Big deal", "owner_id": emp["id"]}, headers=h)
    assert len(sent) == 3

    eh = {"Authorization": "Bearer " + client.post("/api/auth/login", json={"email": email, "password": "employee-pass-1"}).json()["access_token"]}
    assert client.patch("/api/auth/me", json={"notify_email": False}, headers=eh).json()["notify_email"] is False
    client.post("/api/tasks", json={"title": "Muted", "assigned_to": emp["id"]}, headers=h)
    assert len(sent) == 3  # opted out
