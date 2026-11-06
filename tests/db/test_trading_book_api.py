"""Owner trading book API against a synthetic backtest."""

from fastapi.testclient import TestClient

from backend.db.account_store import AccountStore
from backend.db.auth_store import AuthStore
from backend.services.trading_access import issue_access
from tests.db.test_trading_delegation_contract import draft


def test_owner_reads_and_books_synthetic_order_without_touching_real_accounts(
    db_isolated, monkeypatch
):
    from backend.main import app

    monkeypatch.setattr(AuthStore, "auth_disabled", lambda self: False)
    monkeypatch.setattr(AuthStore, "api_token", lambda self: "synthetic-owner-token")
    monkeypatch.setattr(AuthStore, "is_configured", lambda self: True)
    monkeypatch.setattr(AuthStore, "trust_loopback", lambda self: False)
    monkeypatch.setattr("backend.api._deps.demo_open_access_active", lambda: False)
    client = TestClient(app)
    owner = {"Authorization": "Bearer synthetic-owner-token"}
    before = AccountStore().all()
    result = client.post("/api/trading/delegations", headers=owner, json=draft()).json()
    run, workspace = result["run"]["id"], result["workspace"]["id"]
    root = f"/api/trading/runs/{run}"
    participant = {"Authorization": f"Bearer {issue_access(run)['token']}"}
    assert client.get(root + "/accounts", headers=participant).status_code == 401
    accounts = client.get(root + "/accounts", headers=owner)
    assert accounts.status_code == 200 and accounts.headers["cache-control"] == "no-store"
    account_id = accounts.json()["items"][0]["id"]
    assert client.get("/api/trading/workspaces", headers=owner).json()["total"] == 1
    assert (
        client.get(f"/api/trading/workspaces/{workspace}/runs", headers=owner).json()["total"] == 1
    )
    assert client.get(root + "/environment", headers=owner).status_code == 200
    assert client.get(root + "/market-data", headers=owner).json()["total"] == 1
    assert client.get(root + "/performance", headers=owner).status_code == 200
    intent = {
        "account_id": account_id,
        "instrument": {"symbol": "ACME"},
        "side": "buy",
        "quantity": "1",
        "request_id": "synthetic-order",
    }
    submitted = client.post(root + "/orders", headers=owner, json=intent)
    assert submitted.status_code == 201 and submitted.json()["status"] == "open"
    assert (
        client.post(root + "/orders", headers=owner, json=intent).json()["id"]
        == submitted.json()["id"]
    )
    assert client.get(root + "/orders", headers=owner).json()["total"] == 1
    assert client.get(root + "/fills", headers=owner).json()["total"] == 0
    assert "observations" not in client.get(root, headers=owner).json()
    decision = client.post(
        root + "/decisions", headers=owner, json={"summary": "Synthetic decision"}
    )
    assert decision.status_code == 201
    assert client.get(root + "/events", headers=owner).json()["total"] > 0
    assert client.get(root + "/orders", headers=owner, params={"limit": 501}).status_code == 422
    assert client.post(root + "/observations", headers=owner, json=[]).status_code == 422
    canceled = client.delete(root + "/orders/" + submitted.json()["id"], headers=owner)
    assert canceled.status_code == 200 and canceled.json()["status"] == "canceled"
    assert client.delete(root + "/orders/unknown", headers=owner).status_code in {404, 422}
    assert AccountStore().all() == before
