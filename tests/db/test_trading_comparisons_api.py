"""Compare only matching synthetic backtest scenarios at the same clock."""

import asyncio

from fastapi.testclient import TestClient

from backend.db.auth_store import AuthStore
from backend.services.trading import lifecycle
from backend.services.trading_access import issue_access
from tests.db.test_trading_delegation_contract import draft


def test_comparison_checks_scenario_and_discloses_different_clocks(db_isolated, monkeypatch):
    from backend.main import app

    monkeypatch.setattr(AuthStore, "auth_disabled", lambda self: False)
    monkeypatch.setattr(AuthStore, "api_token", lambda self: "synthetic-owner-token")
    monkeypatch.setattr(AuthStore, "is_configured", lambda self: True)
    monkeypatch.setattr(AuthStore, "trust_loopback", lambda self: False)
    monkeypatch.setattr("backend.api._deps.demo_open_access_active", lambda: False)
    client = TestClient(app)
    owner = {"Authorization": "Bearer synthetic-owner-token"}
    first = client.post("/api/trading/delegations", headers=owner, json=draft()).json()["run"]["id"]
    second_result = client.post("/api/trading/delegations", headers=owner, json=draft()).json()
    second = second_result["run"]["id"]
    different = draft()
    different["environment"]["accounts"][0]["capital"] = "900"
    third = client.post("/api/trading/delegations", headers=owner, json=different).json()["run"][
        "id"
    ]
    base = "/api/trading/comparisons"
    participant = {"Authorization": f"Bearer {issue_access(first)['token']}"}
    body = {"name": "Synthetic comparison", "run_ids": [first, second]}
    assert client.post(base, headers=participant, json=body).status_code == 401
    assert (
        client.post(base, headers=owner, json={**body, "run_ids": [first, third]}).status_code
        == 409
    )
    assert (
        client.post(base, headers=owner, json={**body, "run_ids": [first, first]}).status_code
        == 409
    )
    created = client.post(base, headers=owner, json=body)
    assert created.status_code == 201 and created.headers["cache-control"] == "no-store"
    assert created.json()["comparable"] is True
    assert len(created.json()["results"]) == 2
    comparison = created.json()["id"]
    assert client.get(base, headers=owner).json()["total"] == 1
    asyncio.run(lifecycle.apply_run_action(first, {"action": "advance"}))
    changed = client.get(f"{base}/{comparison}", headers=owner).json()
    assert changed["comparable"] is False
    assert "Historical runs are at different environment times" in changed["reasons"]
    workspace = second_result["workspace"]["id"]
    asyncio.run(lifecycle.apply_run_action(second, {"action": "pause"}))
    amended = client.post(
        f"/api/trading/workspaces/{workspace}/amendments",
        headers=owner,
        json={"instructions": "Preserve cash", "reason": "Synthetic", "expected_revision": 1},
    )
    assert amended.status_code == 200
    changed = client.get(f"{base}/{comparison}", headers=owner).json()
    assert changed["comparable"] is False
    assert (
        "Mandate or execution conditions changed after this comparison was created"
        in changed["reasons"]
    )
