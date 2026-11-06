"""Synthetic orders and decisions retain identity-linked, time-bounded evidence."""

import asyncio
from decimal import Decimal

import pytest

from backend.core.errors import ConflictError, NotFoundError
from backend.core.trading_runtime import bind_trading_context
from backend.services.trading import (
    activity,
    delegation,
    evidence,
    execution,
    lifecycle,
    performance,
    statements,
)
from backend.services.trading_access import issue_access, revoke_access, token_digest

T0 = "2026-01-05T14:30:00Z"
T1 = "2026-01-05T14:31:00Z"
INSTRUMENT = {"symbol": "ACME", "venue": "simulation", "asset_class": "stock", "currency": "USD"}


def call(coro):
    return asyncio.run(coro)


def make_run():
    result = call(
        delegation.create_delegation(
            {
                "workspace": {"name": "Synthetic"},
                "environment": {
                    "mode": "backtest",
                    "start_at": T0,
                    "end_at": "2026-01-05T15:00:00Z",
                    "accounts": [{"capital": "1000"}],
                    "observations": [
                        {"instrument": INSTRUMENT, "timestamp": T0, "price": "100"},
                        {"instrument": INSTRUMENT, "timestamp": T1, "price": "110"},
                    ],
                },
            }
        )
    )
    return result["run"]["id"]


def test_order_fill_and_decision_link_to_data_available_at_decision(db_isolated):
    run_id = make_run()
    decision = activity.record_decision(run_id, {"summary": "Synthetic decision"})
    account = performance.get_account(run_id)["items"][0]
    order = call(
        execution.submit_order(
            run_id,
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
    call(lifecycle.apply_run_action(run_id, {"action": "advance"}))
    fill = execution.list_fills(run_id)["items"][0]
    linked = evidence.get_evidence(run_id, "fill", fill["id"])
    assert linked["order"]["id"] == order["id"]
    assert linked["decision"]["id"] == decision["id"]
    assert [row["price"] for row in linked["observations"]] == ["100"]
    assert linked["data_context"]["recorded"] is True
    assert "not proof" in linked["data_context"]["meaning"]
    statement = statements.get_statement(run_id)
    assert Decimal(statement["accounts"][0]["closing_cash"]) == Decimal("890")
    assert statement["accounts"][0]["cash_reconciled"] is True
    assert statement["model_cost_treatment"] == "separate_from_trading_pnl"


def test_missing_decision_is_explicit_and_other_run_is_not_readable(db_isolated):
    run_id, other = make_run(), make_run()
    account = performance.get_account(run_id)["items"][0]
    order = call(
        execution.submit_order(
            run_id,
            {
                "account_id": account["id"],
                "instrument": INSTRUMENT,
                "side": "buy",
                "quantity": "1",
                "request_id": "no-decision",
            },
        )
    )
    assert (
        "Decision link not recorded"
        in evidence.get_evidence(run_id, "order", order["id"])["missing_links"]
    )
    with pytest.raises(NotFoundError):
        evidence.get_evidence(other, "order", order["id"])


def test_revoked_or_wrong_run_grants_cannot_read_evidence_or_statement(db_isolated):
    run_id, other = make_run(), make_run()
    decision = activity.record_decision(run_id, {"summary": "Synthetic"})
    grant = issue_access(run_id)
    with bind_trading_context(run_id, "external", token_digest(grant["token"])):
        assert (
            evidence.get_evidence(run_id, "event", decision["id"])["decision"]["id"]
            == decision["id"]
        )
        with pytest.raises(ConflictError, match="another run"):
            statements.get_statement(other)
        revoke_access(run_id)
        with pytest.raises(ConflictError, match="revoked"):
            evidence.get_evidence(run_id, "event", decision["id"])
        with pytest.raises(ConflictError, match="revoked"):
            activity.list_events(run_id)
