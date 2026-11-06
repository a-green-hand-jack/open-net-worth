"""End-to-end synthetic order accounting through the run's simulated clock."""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from decimal import Decimal, localcontext
from fractions import Fraction
from threading import Barrier

import pytest

from backend.core.errors import ConflictError, ValidationError
from backend.db.account_store import AccountStore
from backend.db.trading_store import TradingStore, trading_transaction
from backend.db.transaction_store import TransactionStore
from backend.services.trading import execution, lifecycle, market, performance, workspaces

T0 = "2026-01-05T14:30:00+00:00"
T1 = "2026-01-05T14:31:00+00:00"
T2 = "2026-01-05T14:32:00+00:00"
END = "2026-01-05T15:00:00+00:00"
INSTRUMENT = {"symbol": "ACME", "venue": "simulation", "asset_class": "stock", "currency": "USD"}


def call(coro):
    return asyncio.run(coro)


def setup_run():
    workspace = workspaces.create_workspace({"name": "Synthetic"})
    run = workspaces.create_run(
        workspace["id"],
        {
            "mode": "backtest",
            "start_at": T0,
            "end_at": END,
            "accounts": [{"capital": "1000"}],
            "observations": [
                {"instrument": INSTRUMENT, "timestamp": T0, "price": "100", "volume": "10"},
                {"instrument": INSTRUMENT, "timestamp": T1, "price": "110", "volume": "2"},
                {"instrument": INSTRUMENT, "timestamp": T2, "price": "120", "volume": "10"},
            ],
        },
    )
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    account = performance.get_account(run["id"])["items"][0]
    return run["id"], account["id"]


def order(account_id, request_id="synthetic-order", quantity="3"):
    return {
        "account_id": account_id,
        "instrument": INSTRUMENT,
        "side": "buy",
        "quantity": quantity,
        "request_id": request_id,
    }


def test_replay_reserves_cash_fills_in_steps_and_never_writes_real_book(db_isolated):
    real_accounts = AccountStore().all()
    run_id, account_id = setup_run()
    submitted = call(execution.submit_order(run_id, order(account_id)))
    assert submitted["status"] == "open"
    assert Decimal(performance.get_account(run_id)["items"][0]["available_cash"]) == Decimal("700")
    assert execution.list_fills(run_id)["total"] == 0
    call(lifecycle.apply_run_action(run_id, {"action": "advance"}))
    assert execution.list_orders(run_id)["items"][0]["filled_quantity"] == "2"
    call(lifecycle.apply_run_action(run_id, {"action": "advance"}))
    assert execution.list_orders(run_id)["items"][0]["status"] == "filled"
    assert execution.list_fills(run_id)["total"] == 2
    account = performance.get_account(run_id)["items"][0]
    assert Decimal(account["cash"]) == Decimal("660")
    assert performance.get_performance(run_id)["equity"] == 1020
    assert AccountStore().all() == real_accounts


def test_stock_and_crypto_use_separate_currency_accounts_without_real_ledger_writes(db_isolated):
    stock = {
        "symbol": "ACME",
        "venue": "synthetic-stock",
        "asset_class": "stock",
        "currency": "USD",
    }
    crypto = {
        "symbol": "EXAMPLE/EUR",
        "venue": "synthetic-crypto",
        "asset_class": "crypto",
        "currency": "EUR",
    }
    workspace = workspaces.create_workspace(
        {
            "name": "Cross-market synthetic mandate",
            "mandate": {"instruments": [stock, crypto], "fee_bps": "100"},
        }
    )
    run = workspaces.create_run(
        workspace["id"],
        {
            "mode": "backtest",
            "start_at": T0,
            "end_at": END,
            "accounts": [
                {
                    "name": "Synthetic stocks",
                    "venue": stock["venue"],
                    "capital": "1000",
                    "currency": "USD",
                },
                {
                    "name": "Synthetic crypto",
                    "venue": crypto["venue"],
                    "capital": "1000",
                    "currency": "EUR",
                },
            ],
            "fx_rates": {"USD": "1", "EUR": "1.1"},
            "observations": [
                {"instrument": instrument, "timestamp": stamp, "price": price}
                for instrument, initial, final in [(stock, "100", "101"), (crypto, "10", "11")]
                for stamp, price in [(T0, initial), (T1, final)]
            ],
        },
    )
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    real_transactions = TransactionStore().all()
    for account, instrument in zip(performance.get_account(run["id"])["items"], [stock, crypto]):
        call(
            execution.submit_order(
                run["id"],
                {
                    "account_id": account["id"],
                    "instrument": instrument,
                    "side": "buy",
                    "quantity": "1",
                    "request_id": "cross-market",
                },
            )
        )
    call(lifecycle.apply_run_action(run["id"], {"action": "advance", "until": T1}))
    assert {
        fill["instrument"]["asset_class"] for fill in execution.list_fills(run["id"])["items"]
    } == {"stock", "crypto"}
    assert performance.get_performance(run["id"])["equity"] == pytest.approx(2098.869)
    assert TransactionStore().all() == real_transactions


def test_request_identity_and_reservation_prevent_duplicate_or_overspending(db_isolated):
    run_id, account_id = setup_run()
    first = call(execution.submit_order(run_id, order(account_id)))
    assert call(execution.submit_order(run_id, order(account_id)))["id"] == first["id"]
    with pytest.raises(ConflictError):
        call(execution.submit_order(run_id, order(account_id, quantity="4")))
    with pytest.raises(ConflictError):
        call(execution.submit_order(run_id, order(account_id, request_id="second", quantity="8")))
    assert execution.list_orders(run_id)["total"] == 1


@pytest.mark.timeout(30)
def test_concurrent_identical_requests_create_one_order_and_one_reservation(db_isolated):
    run_id, account_id = setup_run()
    start = Barrier(2, timeout=5)

    def submit():
        start.wait()
        return call(execution.submit_order(run_id, order(account_id)))

    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(submit) for _ in range(2)]
        results = [future.result(timeout=20) for future in futures]
    assert results[0]["id"] == results[1]["id"]
    assert execution.list_orders(run_id)["total"] == 1
    assert Decimal(performance.get_account(run_id)["items"][0]["available_cash"]) == Decimal("700")


@pytest.mark.timeout(30)
def test_concurrent_distinct_orders_cannot_reserve_more_than_cash(db_isolated):
    run_id, account_id = setup_run()
    start = Barrier(2, timeout=5)

    def submit(request_id):
        start.wait()
        try:
            return call(execution.submit_order(run_id, order(account_id, request_id, "8")))
        except ConflictError as exc:
            return str(exc)

    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(submit, f"request-{i}") for i in range(2)]
        results = [future.result(timeout=20) for future in futures]
    rejected = [result for result in results if isinstance(result, str)]
    assert len(rejected) == 1
    assert "Insufficient" in rejected[0]
    assert execution.list_orders(run_id)["total"] == 1
    assert Decimal(performance.get_account(run_id)["items"][0]["available_cash"]) == Decimal("200")


def test_marketable_sell_limit_cannot_understate_order_notional(db_isolated):
    stamp = datetime.now(timezone.utc)
    workspace = workspaces.create_workspace(
        {"name": "Synthetic", "mandate": {"max_order_notional": "100"}}
    )
    run = workspaces.create_run(
        workspace["id"],
        {
            "mode": "paper",
            "start_at": (stamp - timedelta(minutes=1)).isoformat(),
            "end_at": (stamp + timedelta(days=1)).isoformat(),
            "accounts": [{"capital": "1000"}],
            "observations": [
                {"instrument": INSTRUMENT, "timestamp": stamp.isoformat(), "price": "100"}
            ],
        },
    )
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    account_id = performance.get_account(run["id"])["items"][0]["id"]
    for i in range(10):
        call(
            execution.submit_order(
                run["id"], order(account_id, request_id=f"buy-{i}", quantity="1")
            )
        )
    sell = {
        **order(account_id, request_id="sell-all", quantity="10"),
        "side": "sell",
        "order_type": "limit",
        "limit_price": "1",
    }
    with pytest.raises(ConflictError, match="notional"):
        call(execution.submit_order(run["id"], sell))


def test_preflight_rejects_notional_over_cap_without_decimal_rounding(db_isolated):
    run_id, account_id = setup_run()
    with trading_transaction() as conn:
        run = TradingStore("runs").required(run_id, conn=conn)
        snapshot = {**run["workspace_snapshot"]}
        snapshot["mandate"] = {**snapshot["mandate"], "max_order_notional": "100"}
        TradingStore("runs").update_by_id(run_id, {"workspace_snapshot": snapshot}, conn=conn)
    with pytest.raises(ConflictError, match="notional"):
        call(
            execution.submit_order(
                run_id, order(account_id, quantity="1.0000000000000000000000000001")
            )
        )
    assert execution.list_orders(run_id)["total"] == 0
    assert call(execution.submit_order(run_id, order(account_id, quantity="1")))["status"] == "open"
    with pytest.raises(ValidationError, match="supported precision"):
        call(execution.submit_order(run_id, order(account_id, "tiny", "1e-129")))


def test_backtest_partial_fills_stay_within_order_notional_cap(db_isolated):
    run_id, account_id = setup_run()
    with trading_transaction() as conn:
        run = TradingStore("runs").required(run_id, conn=conn)
        snapshot = {**run["workspace_snapshot"]}
        snapshot["mandate"] = {**snapshot["mandate"], "max_order_notional": "300"}
        TradingStore("runs").update_by_id(run_id, {"workspace_snapshot": snapshot}, conn=conn)
    call(execution.submit_order(run_id, order(account_id)))
    call(lifecycle.apply_run_action(run_id, {"action": "advance"}))
    call(lifecycle.apply_run_action(run_id, {"action": "advance"}))
    fills = execution.list_fills(run_id)["items"]
    assert len(fills) == 2
    with localcontext() as ctx:
        ctx.prec = 80
        assert sum(Decimal(fill["quantity"]) * Decimal(fill["price"]) for fill in fills) <= Decimal(
            "300"
        )
    account = TradingStore("accounts").required(account_id)
    actual_quantity = Fraction(Decimal(next(iter(account["positions"].values()))["quantity"]))
    actual_cash = Fraction(Decimal(account["cash"]))
    filled_quantity = sum(Fraction(Decimal(fill["quantity"])) for fill in fills)
    spent = sum(
        Fraction(Decimal(fill["quantity"])) * Fraction(Decimal(fill["price"])) for fill in fills
    )
    assert actual_cash == Fraction(1000) - spent
    assert actual_quantity == filled_quantity
    displayed = performance.get_account(run_id)["items"][0]
    displayed_position = next(iter(displayed["positions"].values()))
    available_quantity = Fraction(Decimal(displayed_position["available_quantity"]))
    assert available_quantity == actual_quantity
    assert Fraction(Decimal(displayed["available_cash"])) == actual_cash - Fraction(
        Decimal(displayed["reserved_cash"])
    )
    saved_order = execution.list_orders(run_id)["items"][0]
    reservation = Fraction(Decimal(saved_order["reserved_cash"]))
    initial_reservation = Fraction(Decimal(saved_order["initial_reserved_cash"]))
    expected_reservation = initial_reservation * (Fraction(3) - filled_quantity) / 3
    assert reservation >= expected_reservation
    assert len(Decimal(saved_order["reserved_cash"]).as_tuple().digits) <= 128


@pytest.mark.parametrize("fee_bps", ["0", "25"])
def test_cash_limited_replay_fill_is_bounded_and_affordable(db_isolated, fee_bps):
    workspace = workspaces.create_workspace({"name": "Synthetic", "mandate": {"fee_bps": fee_bps}})
    run = workspaces.create_run(
        workspace["id"],
        {
            "mode": "backtest",
            "start_at": T0,
            "end_at": END,
            "accounts": [{"capital": "1000"}],
            "observations": [
                {"instrument": INSTRUMENT, "timestamp": T0, "price": "100", "volume": "10"},
                {"instrument": INSTRUMENT, "timestamp": T1, "price": "400.3", "volume": "10"},
            ],
        },
    )
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    account_id = performance.get_account(run["id"])["items"][0]["id"]
    call(execution.submit_order(run["id"], order(account_id)))
    call(lifecycle.apply_run_action(run["id"], {"action": "advance"}))
    fill = execution.list_fills(run["id"])["items"][0]
    quantity = Decimal(fill["quantity"])
    assert len(quantity.as_tuple().digits) <= 28
    gross = Fraction(quantity) * Fraction(Decimal(fill["price"]))
    fees = Fraction(Decimal(fill["fees"]))
    assert gross + fees <= Fraction(1000)
    account = TradingStore("accounts").required(account_id)
    assert Fraction(Decimal(account["cash"])) == Fraction(1000) - gross - fees


def test_shared_observation_volume_is_not_overfilled_by_rounding(db_isolated):
    workspace = workspaces.create_workspace({"name": "Synthetic"})
    run = workspaces.create_run(
        workspace["id"],
        {
            "mode": "backtest",
            "start_at": T0,
            "end_at": END,
            "accounts": [{"capital": "1000"}],
            "observations": [
                {"instrument": INSTRUMENT, "timestamp": T0, "price": "100", "volume": "10"},
                {"instrument": INSTRUMENT, "timestamp": T1, "price": "100", "volume": "1"},
            ],
        },
    )
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    account_id = performance.get_account(run["id"])["items"][0]["id"]
    call(
        execution.submit_order(
            run["id"], order(account_id, "first", "0.66666666666666666666666666665")
        )
    )
    call(
        execution.submit_order(
            run["id"], order(account_id, "second", "0.3333333333333333333333333334")
        )
    )
    call(lifecycle.apply_run_action(run["id"], {"action": "advance"}))
    fills = execution.list_fills(run["id"])["items"]
    assert len(fills) == 2
    assert sum(Fraction(Decimal(fill["quantity"])) for fill in fills) <= Fraction(1)


def test_backtest_notional_cap_is_per_order(db_isolated):
    run_id, account_id = setup_run()
    with trading_transaction() as conn:
        run = TradingStore("runs").required(run_id, conn=conn)
        snapshot = {**run["workspace_snapshot"]}
        snapshot["mandate"] = {**snapshot["mandate"], "max_order_notional": "150"}
        TradingStore("runs").update_by_id(run_id, {"workspace_snapshot": snapshot}, conn=conn)
    call(execution.submit_order(run_id, order(account_id, "first", "1")))
    call(execution.submit_order(run_id, order(account_id, "second", "1")))
    call(lifecycle.apply_run_action(run_id, {"action": "advance"}))
    assert all(item["status"] == "filled" for item in execution.list_orders(run_id)["items"])


def test_extreme_observation_exponent_is_refused_before_exact_arithmetic(db_isolated):
    workspace = workspaces.create_workspace(
        {"name": "Synthetic", "mandate": {"max_order_notional": "300"}}
    )
    run = workspaces.create_run(
        workspace["id"],
        {
            "mode": "backtest",
            "start_at": T0,
            "end_at": END,
            "accounts": [{"capital": "1000"}],
            "observations": [
                {"instrument": INSTRUMENT, "timestamp": T0, "price": "100"},
                {"instrument": INSTRUMENT, "timestamp": T1, "price": "1e-1000000000"},
            ],
        },
    )
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    account_id = performance.get_account(run["id"])["items"][0]["id"]
    call(execution.submit_order(run["id"], order(account_id)))
    with pytest.raises(ValidationError, match="supported precision"):
        call(lifecycle.apply_run_action(run["id"], {"action": "advance"}))
    assert execution.list_fills(run["id"])["total"] == 0


def test_extreme_persisted_fill_is_refused_before_exact_arithmetic(db_isolated):
    run_id, account_id = setup_run()
    with trading_transaction() as conn:
        run = TradingStore("runs").required(run_id, conn=conn)
        snapshot = {**run["workspace_snapshot"]}
        snapshot["mandate"] = {**snapshot["mandate"], "max_order_notional": "300"}
        TradingStore("runs").update_by_id(run_id, {"workspace_snapshot": snapshot}, conn=conn)
    call(execution.submit_order(run_id, order(account_id)))
    call(lifecycle.apply_run_action(run_id, {"action": "advance"}))
    fill = execution.list_fills(run_id)["items"][0]
    with trading_transaction() as conn:
        TradingStore("fills").update_by_id(fill["id"], {"price": "1e-1000000000"}, conn=conn)
    with pytest.raises(ValidationError, match="supported precision"):
        call(lifecycle.apply_run_action(run_id, {"action": "advance"}))
    assert execution.list_fills(run_id)["total"] == 1


def test_unrepresentable_derived_quantity_is_refused_before_fill(db_isolated):
    workspace = workspaces.create_workspace(
        {"name": "Synthetic", "mandate": {"max_order_notional": "1e-128"}}
    )
    run = workspaces.create_run(
        workspace["id"],
        {
            "mode": "backtest",
            "start_at": T0,
            "end_at": END,
            "accounts": [{"capital": "1000"}],
            "observations": [
                {"instrument": INSTRUMENT, "timestamp": T0, "price": "1e-128"},
                {"instrument": INSTRUMENT, "timestamp": T1, "price": "1e128"},
            ],
        },
    )
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    account_id = performance.get_account(run["id"])["items"][0]["id"]
    call(execution.submit_order(run["id"], order(account_id, quantity="1")))
    with pytest.raises(ValidationError, match="supported precision"):
        call(lifecycle.apply_run_action(run["id"], {"action": "advance"}))
    assert execution.list_fills(run["id"])["total"] == 0


def test_small_positive_notional_remainder_can_fill_at_a_later_price(db_isolated):
    workspace = workspaces.create_workspace(
        {"name": "Synthetic", "mandate": {"max_order_notional": "300"}}
    )
    run = workspaces.create_run(
        workspace["id"],
        {
            "mode": "backtest",
            "start_at": T0,
            "end_at": END,
            "accounts": [{"capital": "1000"}],
            "observations": [
                {"instrument": INSTRUMENT, "timestamp": T0, "price": "100", "volume": "10"},
                {"instrument": INSTRUMENT, "timestamp": T1, "price": "110", "volume": "2"},
                {"instrument": INSTRUMENT, "timestamp": T2, "price": "120", "volume": "10"},
                {
                    "instrument": INSTRUMENT,
                    "timestamp": "2026-01-05T14:33:00+00:00",
                    "price": "0.000000000000000000000000001",
                    "volume": "10",
                },
            ],
        },
    )
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    account_id = performance.get_account(run["id"])["items"][0]["id"]
    call(execution.submit_order(run["id"], order(account_id)))
    for _ in range(3):
        call(lifecycle.apply_run_action(run["id"], {"action": "advance"}))
    result = execution.list_fills(run["id"])
    assert result["total"] == 3
    with localcontext() as ctx:
        ctx.prec = 100
        assert sum(Decimal(f["quantity"]) * Decimal(f["price"]) for f in result["items"]) <= 300


def test_exhausted_notional_cap_releases_remaining_reservation(db_isolated):
    workspace = workspaces.create_workspace(
        {"name": "Synthetic", "mandate": {"max_order_notional": "300"}}
    )
    run = workspaces.create_run(
        workspace["id"],
        {
            "mode": "backtest",
            "start_at": T0,
            "end_at": END,
            "accounts": [{"capital": "1000"}],
            "observations": [
                {"instrument": INSTRUMENT, "timestamp": T0, "price": "100", "volume": "10"},
                {"instrument": INSTRUMENT, "timestamp": T1, "price": "150", "volume": "2"},
            ],
        },
    )
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    account_id = performance.get_account(run["id"])["items"][0]["id"]
    call(execution.submit_order(run["id"], order(account_id)))
    call(lifecycle.apply_run_action(run["id"], {"action": "advance"}))
    result = execution.list_orders(run["id"])["items"][0]
    assert result["status"] not in {"open", "partially_filled"}
    assert Decimal(result["reserved_cash"]) == 0


def test_stopped_paper_run_retains_final_valuation_after_quote_expiry(db_isolated, monkeypatch):
    stamp = datetime.now(timezone.utc)
    workspace = workspaces.create_workspace({"name": "Synthetic"})
    run = workspaces.create_run(
        workspace["id"],
        {
            "mode": "paper",
            "start_at": (stamp - timedelta(minutes=1)).isoformat(),
            "end_at": (stamp + timedelta(days=1)).isoformat(),
            "accounts": [{"capital": "1000"}],
            "observations": [
                {"instrument": INSTRUMENT, "timestamp": stamp.isoformat(), "price": "100"}
            ],
        },
    )
    call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    account_id = performance.get_account(run["id"])["items"][0]["id"]
    call(execution.submit_order(run["id"], order(account_id, quantity="1")))
    call(lifecycle.apply_run_action(run["id"], {"action": "stop"}))
    before = performance.get_performance(run["id"])
    monkeypatch.setattr(market, "now", lambda: (stamp + timedelta(days=1)).isoformat())
    after = performance.get_performance(run["id"])
    assert after["valuation_complete"]
    assert after["equity"] == before["equity"]
    assert after["as_of"] == before["as_of"]


def test_lifetime_drawdown_survives_bounded_valuation_history(db_isolated):
    run_id, _ = setup_run()
    run = workspaces.get_run(run_id)
    with trading_transaction() as conn:
        TradingStore("runs").update_by_id(
            run_id,
            {
                "lifetime_peak_equity": "1200",
                "lifetime_max_drawdown_pct": "25",
                "valuation_history": [{"timestamp": run["current_time"], "equity": 1000}],
            },
            conn=conn,
        )
    assert performance.get_performance(run_id)["max_drawdown_pct"] == 25


def test_day_order_requires_verified_session_calendar(db_isolated):
    run_id, account_id = setup_run()
    with pytest.raises(ConflictError, match="verified session calendar"):
        call(execution.submit_order(run_id, {**order(account_id), "time_in_force": "day"}))


def test_pause_cancels_open_orders_and_releases_reservation(db_isolated):
    run_id, account_id = setup_run()
    call(execution.submit_order(run_id, order(account_id)))
    paused = call(lifecycle.apply_run_action(run_id, {"action": "pause"}))
    assert paused["state"] == "paused"
    assert execution.list_orders(run_id)["items"][0]["status"] == "canceled"
    assert Decimal(performance.get_account(run_id)["items"][0]["available_cash"]) == Decimal("1000")


def test_live_run_without_human_authorization_cannot_start(db_isolated):
    workspace = workspaces.create_workspace({"name": "Synthetic"})
    start = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
    run = workspaces.create_run(
        workspace["id"],
        {
            "mode": "live",
            "start_at": start,
            "live_authorized": False,
            "accounts": [{"capital": "1000"}],
        },
    )
    with pytest.raises(ConflictError, match="Human authorization"):
        call(lifecycle.apply_run_action(run["id"], {"action": "start"}))
    assert TradingStore("orders").all() == []
