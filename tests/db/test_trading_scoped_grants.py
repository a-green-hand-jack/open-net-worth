"""External trading grants are scoped, revocable and checked at the order boundary."""

import asyncio
from datetime import datetime, timedelta, timezone

import pytest

from backend.core.errors import ConflictError, ValidationError
from backend.core.trading_runtime import bind_trading_context
from backend.db.trading_store import TradingStore
from backend.services.trading import execution, lifecycle, performance, workspaces
from backend.services.trading_access import (
    authenticate_access,
    issue_access,
    revoke_access,
    token_digest,
)

T0 = "2026-01-05T14:30:00+00:00"
T1 = "2026-01-05T15:30:00+00:00"
INSTRUMENT = {"symbol": "ACME", "venue": "simulation", "asset_class": "stock", "currency": "USD"}


def call(coro):
    return asyncio.run(coro)


def make_run():
    workspace = workspaces.create_workspace({"name": "Synthetic"})
    run = workspaces.create_run(
        workspace["id"],
        {
            "mode": "backtest",
            "start_at": T0,
            "end_at": T1,
            "accounts": [{"capital": "1000"}],
            "observations": [{"instrument": INSTRUMENT, "timestamp": T0, "price": "100"}],
        },
    )
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    return run["id"]


def order(run_id, request):
    account = performance.get_account(run_id)["items"][0]
    return {
        "account_id": account["id"],
        "instrument": INSTRUMENT,
        "side": "buy",
        "quantity": "1",
        "request_id": request,
    }


def test_grants_are_scoped_rotatable_and_not_stored_as_plaintext(db_isolated):
    run_id, other_run = make_run(), make_run()
    first = issue_access(run_id)
    assert authenticate_access(run_id, first["token"])
    assert not authenticate_access(other_run, first["token"])
    stored = TradingStore("grants").required(run_id)
    assert stored["token_hash"] == token_digest(first["token"])
    assert first["token"] not in str(stored)
    second = issue_access(run_id)
    assert not authenticate_access(run_id, first["token"])
    assert authenticate_access(run_id, second["token"])
    revoke_access(run_id)
    assert not authenticate_access(run_id, second["token"])


def test_revocation_is_rechecked_inside_order_transaction(db_isolated):
    run_id = make_run()
    issued = issue_access(run_id)
    with bind_trading_context(run_id, "external", token_digest(issued["token"])):
        call(execution.submit_order(run_id, order(run_id, "before-revoke")))
        revoke_access(run_id)
        with pytest.raises(ConflictError, match="revoked"):
            call(execution.submit_order(run_id, order(run_id, "after-revoke")))
    assert execution.list_orders(run_id)["total"] == 1


def test_expired_or_other_run_grant_cannot_write(db_isolated):
    run_id, other_run = make_run(), make_run()
    issued = issue_access(run_id)
    with bind_trading_context(run_id, "external", token_digest(issued["token"])):
        with pytest.raises(ConflictError, match="another run"):
            call(execution.submit_order(other_run, order(other_run, "wrong-run")))
    TradingStore("grants").update_by_id(
        run_id,
        {
            "expires_at": (datetime.now(timezone.utc) - timedelta(seconds=1)).isoformat(),
        },
    )
    assert not authenticate_access(run_id, issued["token"])
    with bind_trading_context(run_id, "external", token_digest(issued["token"])):
        with pytest.raises(ConflictError, match="expired"):
            call(execution.submit_order(run_id, order(run_id, "expired")))
    assert execution.list_orders(run_id)["total"] == 0


def test_terminal_run_cannot_issue_or_authenticate_grant(db_isolated):
    run_id = make_run()
    issued = issue_access(run_id)
    TradingStore("runs").update_by_id(run_id, {"state": "stopped"})
    assert not authenticate_access(run_id, issued["token"])
    with pytest.raises(ValidationError):
        issue_access(run_id)
