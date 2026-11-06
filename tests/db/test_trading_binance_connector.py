"""Synthetic owner configuration and Testnet allocation boundaries."""

import asyncio
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from backend.core.errors import ConflictError, ValidationError
from backend.db.auth_store import AuthStore
from backend.db.connector_store import ConnectorStore
from backend.services import binance_connector
from backend.services.trading import providers, workspaces
from backend.services.trading.binance_spot import BinanceSpotAdapter


@pytest.fixture
def fake_probe(monkeypatch):
    async def probe(config, secrets):
        assert secrets["api_key"] and secrets["api_secret"]
        return (
            {"broker_account_id": "synthetic-wallet"},
            {
                "verified_at": "2026-01-01T00:00:00Z",
                "available_cash": "1000",
                "total_cash": "1000",
                "non_quote_balances": 0,
                "open_orders": 0,
                "last_error": None,
            },
        )

    monkeypatch.setattr(binance_connector, "_probe", probe)


def payload():
    return {
        "api_key": "synthetic-key",
        "api_secret": "synthetic-secret",
        "environment": "testnet",
        "quote_currency": "USDT",
        "account_scope": "dedicated_account",
        "isolated_account": True,
        "enabled": True,
    }


def allocation():
    return {
        "mode": "paper",
        "accounts": [
            {
                "connector_id": "binance",
                "venue": "binance-testnet",
                "currency": "USDT",
                "broker_account_id": "synthetic-wallet",
            }
        ],
    }


def test_owner_configures_secret_storage_and_testnet_allocation(
    db_isolated, fake_probe, monkeypatch
):
    from backend.main import app

    monkeypatch.setattr(AuthStore, "auth_disabled", lambda self: False)
    monkeypatch.setattr(AuthStore, "api_token", lambda self: "synthetic-owner-token")
    monkeypatch.setattr(AuthStore, "is_configured", lambda self: True)
    monkeypatch.setattr(AuthStore, "trust_loopback", lambda self: False)
    monkeypatch.setattr("backend.api._deps.demo_open_access_active", lambda: False)
    client = TestClient(app)
    headers = {"Authorization": "Bearer synthetic-owner-token"}
    assert client.put("/api/binance/config", json=payload()).status_code == 401
    response = client.put("/api/binance/config", headers=headers, json=payload())
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["configured"] is True
    assert "synthetic-key" not in response.text and "synthetic-secret" not in response.text
    assert "api_key" not in ConnectorStore().get("binance")["config"]
    assert isinstance(providers.get_live_adapter({"connector_id": "binance"}), BinanceSpotAdapter)
    assert workspaces._execution_source(allocation()) == "binance_testnet"


def test_wrong_mode_and_real_book_link_are_refused(db_isolated, fake_probe):
    asyncio.run(binance_connector.configure(payload()))
    with pytest.raises(ValidationError, match="Testnet requires Paper"):
        workspaces._execution_source({**allocation(), "mode": "live"})
    with pytest.raises(ValidationError, match="real book"):
        workspaces._execution_source(
            {
                **allocation(),
                "accounts": [{**allocation()["accounts"][0], "book_account_id": "real-book"}],
            }
        )
    with pytest.raises(ValidationError, match="must match"):
        workspaces._execution_source(
            {
                **allocation(),
                "accounts": [{**allocation()["accounts"][0], "broker_account_id": "other"}],
            }
        )


def test_environment_change_requires_new_pair_and_disabled_adapter_refuses(db_isolated, fake_probe):
    asyncio.run(binance_connector.configure(payload()))
    with pytest.raises(ValidationError, match="new key pair"):
        asyncio.run(
            binance_connector.configure(
                {**payload(), "environment": "live", "api_key": None, "api_secret": None}
            )
        )
    ConnectorStore().set_enabled("binance", False)
    with pytest.raises(ConflictError, match="not configured and enabled"):
        providers.get_live_adapter({"connector_id": "binance"})


def test_testnet_run_executes_through_synthetic_broker_without_touching_real_book(
    db_isolated, fake_probe, monkeypatch
):
    from backend.db.account_store import AccountStore
    from backend.services.trading import execution, lifecycle, performance
    from backend.services.trading.binance_rest import BinanceRest
    from tests.test_trading_binance_spot import broker

    asyncio.run(binance_connector.configure(payload()))
    fake, calls = broker(
        changes={"time": int(datetime.now(timezone.utc).timestamp() * 1000) + 1000}
    )

    async def transport(self, method, path, args):
        result = await fake(method, path, args)
        if path == "/api/v3/account":
            result["uid"] = "synthetic-wallet"
        return result

    monkeypatch.setattr(BinanceRest, "__call__", transport)
    before = AccountStore().all()
    now = datetime.now(timezone.utc)
    instrument = {
        "symbol": "ACME/USDT",
        "venue": "binance-testnet",
        "asset_class": "crypto",
        "currency": "USDT",
    }
    workspace = workspaces.create_workspace(
        {"name": "Synthetic", "mandate": {"allowed_asset_classes": ["crypto"]}}
    )
    run = workspaces.create_run(
        workspace["id"],
        {
            "mode": "paper",
            "start_at": (now - timedelta(minutes=1)).isoformat(),
            "end_at": (now + timedelta(days=1)).isoformat(),
            "base_currency": "USDT",
            "fx_rates": {"USDT": "1"},
            "accounts": [{**allocation()["accounts"][0], "capital": "1000"}],
            "observations": [
                {"instrument": instrument, "timestamp": now.isoformat(), "price": "10"}
            ],
        },
    )
    asyncio.run(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    account = performance.get_account(run["id"])["items"][0]
    result = asyncio.run(
        execution.submit_order(
            run["id"],
            {
                "account_id": account["id"],
                "instrument": instrument,
                "side": "buy",
                "quantity": "2",
                "request_id": "synthetic-request",
            },
        )
    )
    assert result["status"] == "filled"
    assert len([1 for method, _, _ in calls if method == "POST"]) == 1
    assert AccountStore().all() == before
