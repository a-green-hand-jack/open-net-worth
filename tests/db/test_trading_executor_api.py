"""Owner controls never accept a participant grant as an owner credential."""

from decimal import Decimal

from fastapi.testclient import TestClient

from backend.db.auth_store import AuthStore
from backend.db.trading_store import TradingStore
from backend.services.trading_access import issue_access
from tests.db.test_trading_executor_runtime import run as run


def test_owner_reconciles_usage_and_participant_is_refused(run, monkeypatch):
    from backend.main import app

    monkeypatch.setattr(AuthStore, "auth_disabled", lambda self: False)
    monkeypatch.setattr(AuthStore, "api_token", lambda self: "synthetic-owner-token")
    monkeypatch.setattr("backend.api._deps.demo_open_access_active", lambda: False)
    run_id = run["id"]
    TradingStore("runs").update_by_id(
        run_id, {"usage_state": "unknown", "usage_turn_id": "synthetic-turn"}
    )
    participant = issue_access(run_id)["token"]
    client = TestClient(app)
    url = f"/api/trading/runs/{run_id}/usage-reconciliation"
    body = {
        "receipt_id": "synthetic-receipt",
        "turn_id": "synthetic-turn",
        "additional_cost_usd": "0.25",
    }
    assert (
        client.post(url, headers={"Authorization": f"Bearer {participant}"}, json=body).status_code
        == 401
    )
    owner = {"Authorization": "Bearer synthetic-owner-token"}
    assert client.post(url, headers=owner, json={**body, "turn_id": "wrong"}).status_code == 409
    response = client.post(url, headers=owner, json=body)
    assert response.status_code == 200
    assert response.json()["usage_state"] == "settled"
    assert Decimal(TradingStore("runs").required(run_id)["model_cost_usd"]) == Decimal("0.25")
    assert client.post(url, headers=owner, json=body).status_code == 409


def test_owner_execution_routes_validate_and_dispatch(run, monkeypatch):
    from backend.api import trading_executor_api
    from backend.main import app

    monkeypatch.setattr(AuthStore, "auth_disabled", lambda self: False)
    monkeypatch.setattr(AuthStore, "api_token", lambda self: "synthetic-owner-token")
    monkeypatch.setattr("backend.api._deps.demo_open_access_active", lambda: False)

    async def agent(run_id, **kwargs):
        return {"run_id": run_id, **kwargs}

    async def script(run_id, source):
        return {"run_id": run_id, "source": source}

    monkeypatch.setattr(trading_executor_api, "run_trading_agent", agent)
    monkeypatch.setattr(trading_executor_api, "execute_strategy", script)
    client = TestClient(app)
    headers = {"Authorization": "Bearer synthetic-owner-token"}
    root = f"/api/trading/runs/{run['id']}"
    assert client.post(root + "/agent", headers=headers, json={"extra": True}).status_code == 422
    assert (
        client.post(root + "/agent", headers=headers, json={"effort": "low"}).json()["effort"]
        == "low"
    )
    assert client.post(root + "/script", headers=headers, json={"source": ""}).status_code == 422
    assert (
        client.post(root + "/script", headers=headers, json={"source": "pass"}).json()["source"]
        == "pass"
    )
