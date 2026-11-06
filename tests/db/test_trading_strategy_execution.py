"""Synthetic strategies use the real isolated runtime and the trading order choke."""

import asyncio
import json
import multiprocessing
import os
import shutil
import subprocess
from concurrent.futures import ThreadPoolExecutor
from threading import Event

import pytest

from backend.core.errors import ConflictError, ValidationError
from backend.db.tool_permission_store import ToolPermissionStore
from backend.db.trading_store import TradingStore, trading_transaction
from backend.sandbox import trading as sandbox
from backend.services import tool_permissions, trading_scripts
from backend.services.trading import delegation, execution, lifecycle, performance


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


def _revoke_in_process(started, finished, action):
    started.set()
    if action == "clear":
        tool_permissions.clear_tool_permission("core", "submit_trading_order")
    else:
        tool_permissions.set_tool_permission("core", "submit_trading_order", "blocked")
    finished.set()


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


def test_strategy_retry_preserves_order_authority_and_rejects_changed_intent(run, monkeypatch):
    tool_permissions.set_tool_permission("core", "submit_trading_order", "always_allow")
    account = performance.get_account(run)["items"][0]
    intent = {
        "account_id": account["id"],
        "instrument": {
            "symbol": "ACME",
            "venue": "simulation",
            "asset_class": "stock",
            "currency": "USD",
        },
        "side": "buy",
        "quantity": "1",
        "request_id": "synthetic-retry",
    }
    receipt = {"ok": True, "result": {"summary": "Synthetic retry analysis", "orders": [intent]}}
    monkeypatch.setattr(trading_scripts, "run_trading_script", lambda *_args, **_kwargs: receipt)
    first = call(trading_scripts.execute_strategy(run, "print('synthetic')"))["orders"][0]
    second = call(trading_scripts.execute_strategy(run, "print('synthetic')"))["orders"][0]
    assert first["decision_id"]
    assert (second["id"], second["decision_id"]) == (first["id"], first["decision_id"])
    assert execution.list_orders(run)["total"] == 1
    assert performance.get_account(run)["items"][0]["available_cash"] == "900"
    receipt["result"]["orders"][0] = {**intent, "quantity": "2"}
    with pytest.raises(ConflictError, match="different order"):
        call(trading_scripts.execute_strategy(run, "print('changed')"))
    assert execution.list_orders(run)["total"] == 1
    assert performance.get_account(run)["items"][0]["available_cash"] == "900"


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


@pytest.mark.parametrize("level", [None, "needs_approval", "blocked"])
def test_strategy_order_requires_unattended_permission(run, monkeypatch, level):
    if level is not None:
        tool_permissions.set_tool_permission("core", "submit_trading_order", level)
    account = TradingStore("accounts").list_scope(run)[0]
    intent = {
        "account_id": account["id"],
        "instrument": {"symbol": "ACME"},
        "side": "buy",
        "quantity": "1",
        "request_id": "synthetic-denied",
    }
    monkeypatch.setattr(
        trading_scripts,
        "run_trading_script",
        lambda *args, **kwargs: {"ok": True, "result": {"orders": [intent]}},
    )
    with pytest.raises(ValidationError, match="owner must allow"):
        call(trading_scripts.execute_strategy(run, 'print("synthetic")'))
    assert execution.list_orders(run)["total"] == 0


def test_strategy_stops_submitting_after_order_permission_is_revoked(run, monkeypatch):
    tool_permissions.set_tool_permission("core", "submit_trading_order", "always_allow")
    account = TradingStore("accounts").list_scope(run)[0]
    orders = [
        {
            "account_id": account["id"],
            "instrument": {"symbol": "ACME"},
            "side": "buy",
            "quantity": "1",
            "request_id": f"synthetic-{index}",
        }
        for index in range(2)
    ]
    monkeypatch.setattr(
        trading_scripts,
        "run_trading_script",
        lambda *args, **kwargs: {"ok": True, "result": {"orders": orders}},
    )
    original_submit = trading_scripts.trading.submit_order

    async def submit_and_revoke(run_id, intent, **kwargs):
        result = await original_submit(run_id, intent, **kwargs)
        tool_permissions.set_tool_permission("core", "submit_trading_order", "blocked")
        return result

    monkeypatch.setattr(trading_scripts.trading, "submit_order", submit_and_revoke)
    with pytest.raises(ValidationError, match="owner must allow"):
        call(trading_scripts.execute_strategy(run, 'print("synthetic")'))
    assert execution.list_orders(run)["total"] == 1


def test_order_permission_lock_serializes_revocation(run):
    tool_permissions.set_tool_permission("core", "submit_trading_order", "always_allow")
    started = Event()
    finished = Event()

    def revoke():
        started.set()
        tool_permissions.set_tool_permission("core", "submit_trading_order", "blocked")
        finished.set()

    with ThreadPoolExecutor(max_workers=1) as pool:
        with trading_transaction() as conn:
            assert (
                ToolPermissionStore().get_level_for_update(
                    "core", "submit_trading_order", conn=conn
                )
                == "always_allow"
            )
            future = pool.submit(revoke)
            assert started.wait(timeout=5)
            assert not finished.wait(timeout=0.3)
        future.result(timeout=10)
    assert tool_permissions.get_tool_permission("core", "submit_trading_order") == "blocked"


@pytest.mark.timeout(35)
@pytest.mark.parametrize("action", ["blocked", "clear"])
def test_order_permission_lock_serializes_cross_process_revocation(run, action):
    tool_permissions.set_tool_permission("core", "submit_trading_order", "always_allow")
    context = multiprocessing.get_context("spawn")
    started, finished = context.Event(), context.Event()
    process = context.Process(target=_revoke_in_process, args=(started, finished, action))
    try:
        with trading_transaction() as conn:
            assert (
                ToolPermissionStore().get_level_for_update(
                    "core", "submit_trading_order", conn=conn
                )
                == "always_allow"
            )
            process.start()
            assert started.wait(timeout=15)
            assert not finished.wait(timeout=0.5)
        process.join(timeout=15)
        assert process.exitcode == 0
        assert finished.is_set()
        expected = "needs_approval" if action == "clear" else "blocked"
        assert tool_permissions.get_tool_permission("core", "submit_trading_order") == expected
        account = TradingStore("accounts").list_scope(run)[0]
        with pytest.raises(ValidationError, match="owner must allow"):
            call(
                execution.submit_order(
                    run,
                    {
                        "account_id": account["id"],
                        "instrument": {"symbol": "ACME"},
                        "side": "buy",
                        "quantity": "1",
                        "request_id": "synthetic-after-revoke",
                    },
                    strategy_order=True,
                )
            )
    finally:
        if process.is_alive():
            process.terminate()
            process.join(timeout=5)


def test_strategy_order_and_revocation_are_serialized_at_order_write(run, monkeypatch):
    tool_permissions.set_tool_permission("core", "submit_trading_order", "always_allow")
    account = TradingStore("accounts").list_scope(run)[0]
    intent = {
        "account_id": account["id"],
        "instrument": {"symbol": "ACME"},
        "side": "buy",
        "quantity": "1",
        "request_id": "synthetic-locked",
    }
    locked, release, revoking, revoked = Event(), Event(), Event(), Event()
    original = ToolPermissionStore.get_level_for_update

    def hold_lock(store, *args, **kwargs):
        level = original(store, *args, **kwargs)
        locked.set()
        if not release.wait(timeout=10):
            raise TimeoutError("test did not release permission lock")
        return level

    def revoke():
        revoking.set()
        tool_permissions.set_tool_permission("core", "submit_trading_order", "blocked")
        revoked.set()

    monkeypatch.setattr(ToolPermissionStore, "get_level_for_update", hold_lock)
    with ThreadPoolExecutor(max_workers=2) as pool:
        order_future = pool.submit(
            lambda: call(execution.submit_order(run, intent, strategy_order=True))
        )
        try:
            assert locked.wait(timeout=10)
            revoke_future = pool.submit(revoke)
            assert revoking.wait(timeout=5)
            assert not revoked.wait(timeout=0.3)
        finally:
            release.set()
        assert order_future.result(timeout=10)["status"] == "open"
        revoke_future.result(timeout=10)
    with pytest.raises(ValidationError, match="owner must allow"):
        call(
            execution.submit_order(
                run, {**intent, "request_id": "synthetic-after"}, strategy_order=True
            )
        )
    assert execution.list_orders(run)["total"] == 1


def test_strategy_order_waits_for_prior_revocation_and_is_refused(run, monkeypatch):
    tool_permissions.set_tool_permission("core", "submit_trading_order", "always_allow")
    account = TradingStore("accounts").list_scope(run)[0]
    intent = {
        "account_id": account["id"],
        "instrument": {"symbol": "ACME"},
        "side": "buy",
        "quantity": "1",
        "request_id": "synthetic-revoke-first",
    }
    stamped, release, ordering, order_finished = Event(), Event(), Event(), Event()
    original = ToolPermissionStore._stamp

    def hold_revocation(store, conn, connector_id, tool, level):
        result = original(store, conn, connector_id, tool, level)
        stamped.set()
        if not release.wait(timeout=10):
            raise TimeoutError("test did not release revocation")
        return result

    def submit():
        ordering.set()
        try:
            return call(execution.submit_order(run, intent, strategy_order=True))
        finally:
            order_finished.set()

    monkeypatch.setattr(ToolPermissionStore, "_stamp", hold_revocation)
    with ThreadPoolExecutor(max_workers=2) as pool:
        revoke_future = pool.submit(
            tool_permissions.set_tool_permission, "core", "submit_trading_order", "blocked"
        )
        try:
            assert stamped.wait(timeout=10)
            order_future = pool.submit(submit)
            assert ordering.wait(timeout=5)
            assert not order_finished.wait(timeout=0.3)
        finally:
            release.set()
        revoke_future.result(timeout=10)
        with pytest.raises(ValidationError, match="owner must allow"):
            order_future.result(timeout=10)
    assert execution.list_orders(run)["total"] == 0


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
