"""Observation-driven paper/replay matching, with explicit liquidity and slippage."""

from decimal import ROUND_DOWN, Decimal, localcontext
from fractions import Fraction

from backend.core.errors import ValidationError
from backend.db.trading_store import TradingStore
from backend.services.trading.common import ACTIVE_ORDER_STATES, amount, event, identity, instant
from backend.services.trading.fills import apply_fill
from backend.services.trading.market import available_observations, instrument_key
from backend.services.trading.quote_authority import quote_is_authorized


def match_orders(conn, run):
    with localcontext() as ctx:
        ctx.prec = 600
        return _match_orders(conn, run)


def _match_orders(conn, run):
    observations = available_observations(run)
    if run["mode"] == "paper":
        latest = {}
        for row in observations:
            key = instrument_key(row["instrument"])
            if key not in latest or instant(row["timestamp"]) > instant(latest[key]["timestamp"]):
                latest[key] = row
        observations = list(latest.values())
    orders = TradingStore("orders").list_scope(run["id"], conn=conn)
    fills = TradingStore("fills").list_scope(run["id"], conn=conn)
    spent_by_order = {}
    if run["workspace_snapshot"]["mandate"].get("max_order_notional") is not None:
        for fill in fills:
            order_id = fill["order_id"]
            spent_by_order[order_id] = spent_by_order.get(order_id, Fraction(0)) + (
                _bounded_fraction(fill["quantity"]) * _bounded_fraction(fill["price"])
            )
    for observation in observations:
        used = sum(
            (
                amount(fill["quantity"])
                for fill in fills
                if fill.get("observation_id") == _observation_id(observation)
            ),
            amount(0),
        )
        for order in orders:
            if not _eligible(run, order, observation):
                continue
            with localcontext() as ctx:
                ctx.prec = 600
                order, consumed, spent = _match(
                    conn,
                    run,
                    order,
                    observation,
                    used,
                    spent_by_order.get(order["id"], Fraction(0)),
                )
            spent_by_order[order["id"]] = spent
            used += consumed
            orders = [order if row["id"] == order["id"] else row for row in orders]


def _observation_id(row):
    return identity(instrument_key(row["instrument"]), row["timestamp"])


def _eligible(run, order, observation):
    if order["status"] not in ACTIVE_ORDER_STATES or order["instrument_key"] != instrument_key(
        observation["instrument"]
    ):
        return False
    if not quote_is_authorized(run, observation["instrument"], observation):
        return False
    stamp = instant(observation["available_at"] or observation["timestamp"])
    if run["mode"] == "backtest" and (
        stamp <= instant(order["submitted_at"])
        or instant(observation["timestamp"]) <= instant(order["submitted_at"])
    ):
        return False
    return instant(observation["timestamp"]) > instant(
        order.get("last_match_timestamp", "1970-01-01T00:00:00+00:00")
    )


def _bounded_fraction(value):
    number = amount(value)
    parts = number.as_tuple()
    if len(parts.digits) > 128 or abs(parts.exponent) > 128:
        raise ValidationError("Trading amount exceeds supported precision")
    return Fraction(number)


def _match(conn, run, order, observation, used, spent):
    mandate = run["workspace_snapshot"]["mandate"]
    cap = mandate.get("max_order_notional")
    if cap is not None:
        _bounded_fraction(observation["price"])
    slip = amount(mandate["slippage_bps"]) / 10000
    price = amount(observation["price"]) * (1 + slip if order["side"] == "buy" else 1 - slip)
    limit = order.get("limit_price")
    if limit is not None and (
        (order["side"] == "buy" and price > amount(limit))
        or (order["side"] == "sell" and price < amount(limit))
    ):
        return order, amount(0), spent
    quantity = amount(order["quantity"]) - amount(order["filled_quantity"])
    if cap is not None:
        remaining = max(Fraction(0), _bounded_fraction(cap) - spent)
        cap_quantity = remaining / _bounded_fraction(price)
        with localcontext() as ctx:
            ctx.prec = 28
            ctx.rounding = ROUND_DOWN
            quantity = min(quantity, Decimal(cap_quantity.numerator) / cap_quantity.denominator)
    if observation["volume"] is not None:
        quantity = min(
            quantity,
            max(
                amount(0),
                amount(observation["volume"]) * amount(mandate["max_participation"]) - used,
            ),
        )
    account = TradingStore("accounts").required(order["account_id"], conn=conn)
    fee_rate = amount(mandate["fee_bps"]) / 10000
    if order["side"] == "buy":
        others = TradingStore("orders").list_scope(run["id"], conn=conn)
        reserved = sum(
            (
                amount(other["reserved_cash"])
                for other in others
                if other["id"] != order["id"]
                and other["account_id"] == account["id"]
                and other["status"] in ACTIVE_ORDER_STATES
            ),
            amount(0),
        )
        available_cash = max(amount(0), amount(account["cash"]) - reserved)
        unit_cost = price * (1 + fee_rate)
        with localcontext() as ctx:
            ctx.prec = 28
            ctx.rounding = ROUND_DOWN
            affordable_quantity = available_cash / unit_cost
        quantity = min(quantity, affordable_quantity)
    if quantity <= 0:
        return order, amount(0), spent
    if cap is not None:
        fill_notional = _bounded_fraction(quantity) * _bounded_fraction(price)
    raw = {
        "execution_id": identity(order["id"], _observation_id(observation)),
        "quantity": str(quantity),
        "price": str(price),
        "fees": str(quantity * price * fee_rate),
        "timestamp": observation["timestamp"] if run["mode"] == "backtest" else run["current_time"],
        "instrument": order["instrument"],
        "side": order["side"],
        "observation_id": _observation_id(observation),
        "broker_order_id": order["id"],
    }
    order = apply_fill(conn, run, order, raw)
    if cap is not None and order["status"] == "partially_filled":
        exhausted = spent + fill_notional >= _bounded_fraction(cap)
        if exhausted:
            order = TradingStore("orders").update_by_id(
                order["id"],
                {"status": "canceled", "reserved_cash": "0", "reserved_quantity": "0"},
                conn=conn,
            )
            event(conn, run, "order_canceled", {"order_id": order["id"], "reason": "notional_cap"})
    order = TradingStore("orders").update_by_id(
        order["id"], {"last_match_timestamp": observation["timestamp"]}, conn=conn
    )
    if cap is not None:
        spent += fill_notional
    return order, quantity, spent
