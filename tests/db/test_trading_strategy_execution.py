"""Synthetic strategies use the real isolated runtime and the trading order choke."""

import asyncio
import json
import os
import shutil
import subprocess

import pytest

from backend.core.errors import ValidationError
from backend.db.trading_store import TradingStore
from backend.sandbox import trading as sandbox
from backend.services import tool_permissions, trading_scripts
from backend.services.trading import delegation, execution, lifecycle


@pytest.fixture
def run(db_isolated):
    result = asyncio.run(
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
                        },
                        {
                            "instrument": {"symbol": "ACME"},
                            "timestamp": "2026-01-05T14:31:00Z",
                            "price": "110",
                        },
                    ],
                },
            }
        )
    )
    return result["run"]["id"]


@pytest.fixture
def docker_runtime():
    if os.environ.get("ONW_TEST_DOCKER") != "1" or not shutil.which("docker"):
        pytest.skip("Set ONW_TEST_DOCKER=1 with Docker and the pinned image available")
    result = subprocess.run(
        ["docker", "image", "inspect", sandbox.IMAGE], capture_output=True, timeout=10, check=False
    )
    if result.returncode:
        pytest.skip("Pinned strategy image is not provisioned")


def call(coro):
    return asyncio.run(coro)


def test_strategy_in_real_sandbox_submits_idempotent_simulated_intent(run, docker_runtime):
    tool_permissions.set_tool_permission("core", "submit_trading_order", "always_allow")
    source = """import json,sys
snapshot=json.load(sys.stdin)
account=snapshot["accounts"]["items"][0]["id"]
instrument=snapshot["observations"]["items"][0]["instrument"]
print(json.dumps({"summary":"Synthetic decision","orders":[{"account_id":account,"instrument":instrument,"side":"buy","quantity":"1","request_id":"synthetic-order"}]}))"""
    first = call(trading_scripts.execute_strategy(run, source))
    second = call(trading_scripts.execute_strategy(run, source))
    assert first["ok"] and second["ok"]
    assert first["orders"][0]["id"] == second["orders"][0]["id"]
    assert first["orders"][0]["decision_id"] == second["orders"][0]["decision_id"]
    assert execution.list_orders(run)["total"] == 1
    assert execution.list_fills(run)["total"] == 0
    call(lifecycle.apply_run_action(run, {"action": "advance"}))
    assert execution.list_fills(run)["total"] == 1


def test_secret_shaped_strategy_is_not_persisted_or_executed(run, monkeypatch):
    invoked = []
    monkeypatch.setattr(
        trading_scripts, "run_trading_script", lambda *args, **kwargs: invoked.append(True)
    )
    secret = "fictional-private-value"
    with pytest.raises(ValidationError, match="credential-shaped"):
        call(trading_scripts.execute_strategy(run, f'api_key = "{secret}"'))
    assert not invoked
    assert secret not in json.dumps(TradingStore("runs").required(run))
    assert secret not in json.dumps(TradingStore("events").list_scope(run))


def test_bad_strategy_intents_do_not_partially_submit(run, monkeypatch):
    tool_permissions.set_tool_permission("core", "submit_trading_order", "always_allow")
    account = TradingStore("accounts").list_scope(run)[0]
    instrument = {
        "symbol": "ACME",
        "venue": "simulation",
        "asset_class": "stock",
        "currency": "USD",
    }
    good = {
        "account_id": account["id"],
        "instrument": instrument,
        "side": "buy",
        "quantity": "1",
        "request_id": "synthetic",
    }
    monkeypatch.setattr(
        trading_scripts,
        "run_trading_script",
        lambda *args, **kwargs: {"ok": True, "result": {"orders": [good, {"invalid": True}]}},
    )
    with pytest.raises(ValidationError, match="invalid order"):
        call(trading_scripts.execute_strategy(run, 'print("synthetic")'))
    assert execution.list_orders(run)["total"] == 0


def test_participant_gateway_runs_scoped_strategy_when_owner_allows(run, docker_runtime):
    from fastapi.testclient import TestClient

    from backend.main import app
    from backend.services.trading_access import issue_access

    tool_permissions.set_tool_permission("core", "run_trading_strategy", "always_allow")
    grant = issue_access(run)
    source = 'import json; print(json.dumps({"summary":"Synthetic wait","orders":[]}))'
    response = TestClient(app).post(
        f"/api/trading/gateway/{run}",
        headers={"Authorization": f"Bearer {grant['token']}"},
        json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": "run_trading_strategy",
                "arguments": {"source": source},
            },
        },
    )
    assert response.status_code == 200
    result = response.json()["result"]
    assert result["isError"] is False
    assert json.loads(result["content"][0]["text"])["ok"] is True
