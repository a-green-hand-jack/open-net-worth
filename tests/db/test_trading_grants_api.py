"""Exercise owner issuance and revocation using only synthetic credentials and data."""

import asyncio

from fastapi.testclient import TestClient

from backend.db.auth_store import AuthStore
from backend.db.trading_store import TradingStore
from backend.services.trading import delegation


def test_owner_controls_grant_and_participant_cannot_rotate_or_revoke(db_isolated, monkeypatch):
    from backend.main import app

    monkeypatch.setattr(AuthStore, "auth_disabled", lambda self: False)
    monkeypatch.setattr(AuthStore, "api_token", lambda self: "synthetic-owner-token")
    monkeypatch.setattr("backend.api._deps.demo_open_access_active", lambda: False)
    run = asyncio.run(
        delegation.create_delegation(
            {
                "workspace": {"name": "Synthetic"},
                "environment": {
                    "mode": "backtest",
                    "start_at": "2026-01-05T14:30:00Z",
                    "end_at": "2026-01-05T15:00:00Z",
                    "accounts": [{"capital": "1000"}],
                    "observations": [
                        {
                            "instrument": {"symbol": "ACME"},
                            "timestamp": "2026-01-05T14:30:00Z",
                            "price": "100",
                        }
                    ],
                },
            }
        )
    )["run"]["id"]
    client = TestClient(app)
    control = f"/api/trading/runs/{run}/access"
    owner = {"Authorization": "Bearer synthetic-owner-token"}
    created = client.post(control, headers=owner, json={"expires_in_seconds": 600})
    assert created.status_code == 200
    assert "no-store" in created.headers["cache-control"]
    token = created.json()["token"]
    participant = {"Authorization": f"Bearer {token}"}
    assert token not in str(TradingStore("grants").required(run))
    assert client.post(control, headers=participant, json={}).status_code == 401
    assert client.delete(control, headers=participant).status_code == 401
    request = {"jsonrpc": "2.0", "id": 1, "method": "initialize"}
    assert (
        client.post(f"/api/trading/gateway/{run}", headers=participant, json=request).status_code
        == 200
    )
    revoked = client.delete(control, headers=owner)
    assert revoked.status_code == 200
    assert "no-store" in revoked.headers["cache-control"]
    assert (
        client.post(f"/api/trading/gateway/{run}", headers=participant, json=request).status_code
        == 401
    )


def test_grant_request_rejects_invalid_expiry_and_unknown_fields(db_isolated, monkeypatch):
    from backend.main import app

    monkeypatch.setattr(AuthStore, "auth_disabled", lambda self: False)
    monkeypatch.setattr(AuthStore, "api_token", lambda self: "synthetic-owner-token")
    monkeypatch.setattr("backend.api._deps.demo_open_access_active", lambda: False)
    client = TestClient(app)
    headers = {"Authorization": "Bearer synthetic-owner-token"}
    assert (
        client.post(
            "/api/trading/runs/synthetic/access", headers=headers, json={"expires_in_seconds": 1}
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/trading/runs/synthetic/access", headers=headers, json={"surprise": True}
        ).status_code
        == 422
    )
