"""Linked evidence is limited to the selected synthetic run."""

import asyncio

from fastapi.testclient import TestClient

from backend.db.auth_store import AuthStore
from backend.services.trading import activity, execution, lifecycle, performance
from backend.services.trading_access import issue_access
from tests.db.test_trading_linked_evidence import INSTRUMENT, make_run


def test_owner_reads_time_bounded_fill_evidence_and_statement(db_isolated, monkeypatch):
    from backend.main import app

    monkeypatch.setattr(AuthStore, "auth_disabled", lambda self: False)
    monkeypatch.setattr(AuthStore, "api_token", lambda self: "synthetic-owner-token")
    monkeypatch.setattr(AuthStore, "is_configured", lambda self: True)
    monkeypatch.setattr(AuthStore, "trust_loopback", lambda self: False)
    monkeypatch.setattr("backend.api._deps.demo_open_access_active", lambda: False)
    run, other = make_run(), make_run()
    decision = activity.record_decision(run, {"summary": "Synthetic decision"})
    account = performance.get_account(run)["items"][0]
    order = asyncio.run(
        execution.submit_order(
            run,
            {
                "account_id": account["id"],
                "instrument": INSTRUMENT,
                "side": "buy",
                "quantity": "1",
                "request_id": "synthetic-order",
                "decision_id": decision["id"],
            },
        )
    )
    asyncio.run(lifecycle.apply_run_action(run, {"action": "advance"}))
    fill = execution.list_fills(run)["items"][0]
    client = TestClient(app)
    owner = {"Authorization": "Bearer synthetic-owner-token"}
    participant = {"Authorization": f"Bearer {issue_access(run)['token']}"}
    url = f"/api/trading/runs/{run}/evidence/fill/{fill['id']}"
    assert client.get(url, headers=participant).status_code == 401
    response = client.get(url, headers=owner)
    assert response.status_code == 200 and response.headers["cache-control"] == "no-store"
    assert response.json()["order"]["id"] == order["id"]
    assert response.json()["decision"]["id"] == decision["id"]
    assert [row["price"] for row in response.json()["observations"]] == ["100"]
    assert (
        client.get(
            f"/api/trading/runs/{other}/evidence/fill/{fill['id']}", headers=owner
        ).status_code
        == 404
    )
    statement = client.get(f"/api/trading/runs/{run}/statement", headers=owner)
    assert (
        statement.status_code == 200 and statement.json()["accounts"][0]["cash_reconciled"] is True
    )
    series = client.get(f"/api/trading/runs/{run}/market-series", headers=owner)
    assert series.status_code == 200 and series.json()["total"] == 2
    assert (
        client.get(
            f"/api/trading/runs/{run}/evidence/invalid/{fill['id']}", headers=owner
        ).status_code
        == 422
    )
