"""Owner delegation controls exercised against an isolated synthetic book."""

from fastapi.testclient import TestClient

from backend.db.auth_store import AuthStore
from backend.db.trading_store import TradingStore
from backend.services.trading.work_records import write_workspace_file
from backend.services.trading_access import issue_access
from tests.db.test_trading_delegation_contract import draft


def test_owner_reviews_creates_and_pauses_a_delegation(db_isolated, monkeypatch):
    from backend.main import app

    monkeypatch.setattr(AuthStore, "auth_disabled", lambda self: False)
    monkeypatch.setattr(AuthStore, "api_token", lambda self: "synthetic-owner-token")
    monkeypatch.setattr(AuthStore, "is_configured", lambda self: True)
    monkeypatch.setattr(AuthStore, "trust_loopback", lambda self: False)
    monkeypatch.setattr("backend.api._deps.demo_open_access_active", lambda: False)
    client = TestClient(app)
    owner = {"Authorization": "Bearer synthetic-owner-token"}
    url = "/api/trading/delegations"
    assert client.post(url + "/review", json=draft()).status_code == 401
    review = client.post(url + "/review", headers=owner, json=draft())
    assert review.status_code == 200 and review.json()["ready"] is True
    assert TradingStore("workspaces").all() == []
    created = client.post(url, headers=owner, json=draft())
    assert created.status_code == 201
    assert created.headers["cache-control"] == "no-store"
    result = created.json()
    workspace, run = result["workspace"]["id"], result["run"]["id"]
    overview = client.get(f"/api/trading/workspaces/{workspace}/overview", headers=owner)
    assert overview.json()["current_run"]["id"] == run
    participant = {"Authorization": f"Bearer {issue_access(run)['token']}"}
    assert (
        client.get(f"/api/trading/workspaces/{workspace}/overview", headers=participant).status_code
        == 401
    )
    assert (
        client.post(
            f"/api/trading/workspaces/{workspace}/actions",
            headers=participant,
            json={"action": "pause"},
        ).status_code
        == 401
    )
    paused = client.post(
        f"/api/trading/workspaces/{workspace}/actions", headers=owner, json={"action": "pause"}
    )
    assert paused.status_code == 200
    assert paused.json()["state"] == "paused"
    amendment = {
        "instructions": "Preserve cash.",
        "reason": "Synthetic review",
        "expected_revision": 1,
    }
    amended = client.post(
        f"/api/trading/workspaces/{workspace}/amendments", headers=owner, json=amendment
    )
    assert amended.status_code == 200
    assert amended.json()["workspace"]["revision"] == 2
    assert (
        client.post(
            f"/api/trading/workspaces/{workspace}/amendments", headers=owner, json=amendment
        ).status_code
        == 409
    )
    activation = {"environment": draft()["environment"], "expected_revision": 2}
    assert (
        client.post(
            f"/api/trading/workspaces/{workspace}/activate", headers=owner, json=activation
        ).status_code
        == 409
    )


def test_owner_cannot_cross_read_workspace_files_and_receives_typed_errors(db_isolated):
    from backend.main import app

    client = TestClient(app)
    first = client.post("/api/trading/delegations", json=draft()).json()
    second = client.post("/api/trading/delegations", json=draft()).json()
    run1, run2 = first["run"]["id"], second["run"]["id"]
    saved = write_workspace_file(run1, "notes.md", "Synthetic analysis")
    assert client.get(f"/api/trading/runs/{run1}/work/{saved['id']}").status_code == 200
    assert (
        client.get(f"/api/trading/runs/{run1}/files", params={"name": "notes.md"}).json()["content"]
        == "Synthetic analysis"
    )
    cross_read = client.get(f"/api/trading/runs/{run2}/work/{saved['id']}")
    assert cross_read.status_code == 422
    assert "Synthetic analysis" not in cross_read.text
    assert client.get(f"/api/trading/runs/{run1}/files", params={"version": 0}).status_code == 422
    invalid = draft()
    invalid["environment"]["accounts"] = []
    assert client.post("/api/trading/delegations/review", json=invalid).status_code == 422
