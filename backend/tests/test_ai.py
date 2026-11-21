import os

import pytest
from test_api import signup  # noqa: F401  (also sets test env vars)

pytestmark = pytest.mark.skipif(not os.getenv("TEST_DATABASE_URL"), reason="TEST_DATABASE_URL not set")


@pytest.fixture(scope="module")
def client():
    from fastapi.testclient import TestClient
    from crm.main import app
    return TestClient(app)


def test_ai_off_and_isolation(client, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("AI_API_KEY", raising=False)
    ha, _, _ = signup(client)
    hb, _, _ = signup(client)
    assert client.get("/api/ai/status", headers=ha).json()["enabled"] is False
    cid = client.post("/api/customers", json={"name": "X"}, headers=ha).json()["id"]
    assert client.post(f"/api/ai/customers/{cid}/summary", headers=hb).status_code == 404
    assert client.post(f"/api/ai/customers/{cid}/summary", headers=ha).status_code == 503
    assert client.post("/api/ai/parse-notes", json={"notes": "hello"}).status_code == 401


def test_ai_parse_and_daily_limit(client, monkeypatch):
    import crm.routers.ai as ai
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test")
    monkeypatch.setenv("AI_DAILY_LIMIT", "2")
    out = '```json\n{"type":"call","subject":"Pricing call","body":"Asked about price","tasks":[{"title":"Send quote","due_date":"2026-12-01","priority":"high"}]}\n```'
    monkeypatch.setattr(ai, "_complete", lambda *a, **k: out)
    h, _, _ = signup(client)
    r = client.post("/api/ai/parse-notes", json={"notes": "Called, wants a quote by Dec 1"}, headers=h)
    assert r.status_code == 200 and r.json()["tasks"][0]["title"] == "Send quote"
    assert client.post("/api/ai/parse-notes", json={"notes": "again"}, headers=h).status_code == 200
    assert client.post("/api/ai/parse-notes", json={"notes": "third"}, headers=h).status_code == 429
    monkeypatch.setattr(ai, "_complete", lambda *a, **k: "not json")
    h2, _, _ = signup(client)
    assert client.post("/api/ai/parse-notes", json={"notes": "bad output"}, headers=h2).status_code == 502
