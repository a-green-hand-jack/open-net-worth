"""Persistent executor behavior with simulated runs and mocked model events."""

import asyncio

import pytest

from backend.core.errors import ConflictError
from backend.core.trading_runtime import trading_context
from backend.services import trading
from backend.services.trading import activity, lifecycle, workspaces


@pytest.fixture
def run(db_isolated):
    workspace = workspaces.create_workspace(
        {"name": "Synthetic comparison", "agent_kind": "lucius"}
    )
    run = workspaces.create_run(
        workspace["id"],
        {
            "mode": "backtest",
            "start_at": "2025-01-01T00:00:00Z",
            "end_at": "2025-01-03T00:00:00Z",
            "accounts": [{"name": "Synthetic account", "capital": "1000"}],
            "observations": [
                {
                    "instrument": {"symbol": "ACME"},
                    "timestamp": "2025-01-01T00:00:00Z",
                    "price": "10",
                }
            ],
        },
    )
    asyncio.run(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    return trading.get_run(run["id"])


def test_agent_cycle_uses_supervised_turn_and_records_real_usage(run, monkeypatch):
    from backend.ai import trading_runner_adapter as adapter

    observed = {}

    async def fake_assistant(session_id, messages, system, **kwargs):
        observed.update(context=trading_context(), system=system, messages=messages)
        yield {"type": "text_delta", "text": "Hold the synthetic account."}
        yield {"type": "turn_done", "usage": {"cost_usd": 0.01, "input_tokens": 10}}

    async def supervised(session_id, kind, make_events, **kwargs):
        observed["supervisor"] = (kind, kwargs["cost_surface"])
        async for _ in make_events("synthetic-turn"):
            pass
        return "ok"

    monkeypatch.setattr(adapter.assistant, "run", fake_assistant)
    monkeypatch.setattr(adapter.assistant, "upsert_session_meta", lambda *args, **kwargs: None)
    monkeypatch.setattr(adapter.turns, "run_inline", supervised)
    result = asyncio.run(adapter.run_lucius_cycle(run["id"]))
    assert result["status"] == "completed"
    assert observed["supervisor"] == ("trading", "automation")
    assert observed["context"].run_id == run["id"]
    assert "net worth" not in observed["system"]
    assert trading_context() is None
    assert trading.get_run(run["id"])["model_cost_usd"] == "0.01"
    events = activity.list_events(run["id"])["items"]
    assert any(event["kind"] == "agent_decision" for event in events)


def test_backtest_waits_for_decision_before_advancing_environment(run):
    from backend.ai.trading_runner_adapter import _advance_environment

    unchanged = asyncio.run(_advance_environment(run))
    assert unchanged["current_time"] == run["current_time"]
    assert unchanged["clock_cursor"] == 0
    trading.record_decision(run["id"], {"summary": "Hold until next observation"})
    advanced = asyncio.run(_advance_environment(trading.get_run(run["id"])))
    assert advanced["clock_cursor"] == 1
    assert advanced["state"] == "completed"


def test_agent_requested_wake_is_preserved_when_summary_is_recorded(run, monkeypatch):
    from backend.ai import trading_runner_adapter as adapter

    async def fake_assistant(*args, **kwargs):
        trading.record_decision(
            run["id"], {"summary": "Wait for market data", "wake_after_seconds": 60}
        )
        yield {"type": "text_delta", "text": "I will wait one minute."}
        yield {"type": "turn_done", "usage": {"cost_usd": 0}}

    async def supervised(session_id, kind, make_events, **kwargs):
        async for _ in make_events("synthetic-wake-turn"):
            pass
        return "ok"

    monkeypatch.setattr(adapter.assistant, "run", fake_assistant)
    monkeypatch.setattr(adapter.assistant, "upsert_session_meta", lambda *args, **kwargs: None)
    monkeypatch.setattr(adapter.turns, "run_inline", supervised)
    asyncio.run(adapter.run_lucius_cycle(run["id"]))
    fresh = trading.get_run(run["id"])
    assert fresh["agent_wake_at"] == "2025-01-01T00:01:00+00:00"


def test_paper_wake_keeps_environment_timestamp_string():
    from backend.ai.trading_runner_adapter import _next_wake

    assert (
        _next_wake({"mode": "paper", "agent_wake_at": "2026-11-04T00:01:00+00:00"})
        == "2026-11-04T00:01:00+00:00"
    )


def test_due_tick_records_decision_before_advancing_backtest(run, monkeypatch):
    from backend.ai import trading_runner_adapter as adapter

    async def fake_assistant(*args, **kwargs):
        yield {"type": "text_delta", "text": "Hold the synthetic account."}
        yield {"type": "turn_done", "usage": {"cost_usd": 0}}

    async def supervised(session_id, kind, make_events, **kwargs):
        async for _ in make_events("synthetic-tick"):
            pass
        return "ok"

    monkeypatch.setattr(adapter.assistant, "run", fake_assistant)
    monkeypatch.setattr(adapter.assistant, "upsert_session_meta", lambda *args, **kwargs: None)
    monkeypatch.setattr(adapter.turns, "run_inline", supervised)
    first = asyncio.run(adapter.run_due_trading_agents())
    assert first["items"][0]["status"] == "completed"
    assert trading.get_run(run["id"])["clock_cursor"] == 0
    asyncio.run(adapter.run_due_trading_agents())
    assert trading.get_run(run["id"])["state"] == "completed"


def test_timed_out_usage_blocks_further_paid_cycles_until_operator_reconciles(run, monkeypatch):
    from backend.ai import trading_runner_adapter as adapter
    from backend.services.trading_usage import reconcile_usage

    async def incomplete(*args, **kwargs):
        yield {"type": "text_delta", "text": "Provider started"}
        await asyncio.sleep(60)

    async def supervised(session_id, kind, make_events, **kwargs):
        async for _ in make_events("interrupted-turn"):
            pass
        return "ok"

    monkeypatch.setattr(adapter, "CYCLE_TIMEOUT", 0.02)
    monkeypatch.setattr(adapter.assistant, "run", incomplete)
    monkeypatch.setattr(adapter.assistant, "upsert_session_meta", lambda *args, **kwargs: None)
    monkeypatch.setattr(adapter.turns, "run_inline", supervised)
    with pytest.raises(TimeoutError):
        asyncio.run(adapter.run_lucius_cycle(run["id"]))
    fresh = trading.get_run(run["id"])
    assert fresh["usage_state"] == "unknown"
    assert fresh["agent_state"] == "usage_unknown"
    with pytest.raises(ConflictError, match="billing reconciliation"):
        asyncio.run(adapter.run_lucius_cycle(run["id"]))
    reconcile_usage(
        run["id"],
        receipt_id="provider-receipt",
        additional_cost_usd="0.25",
        turn_id="interrupted-turn",
    )
    assert trading.get_run(run["id"])["usage_state"] == "settled"
    assert trading.get_run(run["id"])["model_cost_usd"] == "0.25"


def test_usage_observed_before_errored_turn_is_accounted_in_finally(run, monkeypatch):
    from backend.ai import trading_runner_adapter as adapter

    async def partial(*args, **kwargs):
        yield {"type": "turn_done", "usage": {"cost_usd": 0.25, "price_known": True}}
        raise RuntimeError("Synthetic persistence error after usage receipt")

    async def supervised(session_id, kind, make_events, **kwargs):
        async for _ in make_events("partial-receipt-turn"):
            pass

    monkeypatch.setattr(adapter.assistant, "run", partial)
    monkeypatch.setattr(adapter.assistant, "upsert_session_meta", lambda *args, **kwargs: None)
    monkeypatch.setattr(adapter.turns, "run_inline", supervised)
    with pytest.raises(RuntimeError):
        asyncio.run(adapter.run_lucius_cycle(run["id"]))
    assert trading.get_run(run["id"])["model_cost_usd"] == "0.25"
    assert trading.get_run(run["id"])["usage_state"] == "settled"
