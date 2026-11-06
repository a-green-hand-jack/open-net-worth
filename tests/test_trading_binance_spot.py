"""Spot adapter contract tests use a synthetic broker and never contact Binance."""

import pytest

from backend.core.errors import ConflictError
from backend.services.trading.binance_spot import BinanceSpotAdapter

CONFIG = {
    "environment": "testnet",
    "quote_currency": "USDT",
    "isolated_account": True,
    "account_scope": "dedicated_account",
    "broker_account_id": "123",
}
ACCOUNT = {"venue": "binance-testnet", "currency": "USDT", "broker_account_id": "123"}
ORDER = {
    "id": "synthetic-order",
    "quantity": "2",
    "side": "buy",
    "order_type": "market",
    "time_in_force": "gtc",
    "instrument": {
        "symbol": "ACME/USDT",
        "currency": "USDT",
        "asset_class": "crypto",
        "venue": "binance-testnet",
    },
}


def broker(*, changes=None):
    calls = []
    trade = {
        "id": 10,
        "orderId": 44,
        "symbol": "ACMEUSDT",
        "isBuyer": True,
        "qty": "2",
        "price": "10",
        "commission": "0.02",
        "commissionAsset": "USDT",
        "time": 1767625201000,
    }
    trade.update(changes or {})

    async def call(method, path, args):
        calls.append((method, path, args))
        if path == "/api/v3/account":
            return {
                "accountType": "SPOT",
                "canTrade": True,
                "permissions": ["SPOT"],
                "uid": 123,
                "balances": [{"asset": "USDT", "free": "1000", "locked": "0"}],
            }
        if path == "/api/v3/openOrders":
            return []
        if path == "/api/v3/exchangeInfo":
            return {
                "symbols": [
                    {
                        "symbol": "ACMEUSDT",
                        "baseAsset": "ACME",
                        "quoteAsset": "USDT",
                        "isSpotTradingAllowed": True,
                        "status": "TRADING",
                    }
                ]
            }
        if method == "POST" and path == "/api/v3/order":
            return {
                "clientOrderId": args["newClientOrderId"],
                "orderId": 44,
                "symbol": "ACMEUSDT",
                "side": "BUY",
                "origQty": "2",
                "type": "MARKET",
                "status": "FILLED",
                "executedQty": "2",
            }
        if path == "/api/v3/myTrades":
            return [trade]
        raise AssertionError((method, path))

    return call, calls


async def test_simulated_broker_receipt_uses_immutable_client_order_and_fill_identity():
    call, calls = broker()
    receipt = await BinanceSpotAdapter(call, CONFIG).submit(ACCOUNT, ORDER)
    assert receipt["status"] == "filled"
    assert receipt["fills"][0]["execution_id"] == "ACMEUSDT:10"
    assert receipt["fills"][0]["fees"] == "0.02"
    posted = next(args for method, _, args in calls if method == "POST")
    assert posted["newClientOrderId"] == ORDER["id"]


@pytest.mark.parametrize(
    "changes",
    [
        {"isBuyer": False},
        {"symbol": "OTHERUSDT"},
        {"orderId": 99},
        {"qty": "1"},
        {"commissionAsset": "BNB"},
    ],
)
async def test_contradictory_or_incomplete_fill_is_refused(changes):
    call, _ = broker(changes=changes)
    with pytest.raises(ConflictError):
        await BinanceSpotAdapter(call, CONFIG).submit(ACCOUNT, ORDER)


@pytest.mark.parametrize(
    "changes",
    [{"broker_account_id": "other"}, {"currency": "USD"}, {"book_account_id": "real-book"}],
)
async def test_account_authority_is_verified_before_any_order(changes):
    call, calls = broker()
    with pytest.raises(ConflictError):
        await BinanceSpotAdapter(call, CONFIG).submit({**ACCOUNT, **changes}, ORDER)
    assert not any(method == "POST" for method, _, _ in calls)


async def test_live_withdrawal_permission_refuses_before_order():
    original, calls = broker()

    async def call(method, path, args):
        if path == "/sapi/v1/account/apiRestrictions":
            return {
                "enableReading": True,
                "enableSpotAndMarginTrading": True,
                "enableWithdrawals": True,
            }
        return await original(method, path, args)

    adapter = BinanceSpotAdapter(call, {**CONFIG, "environment": "live"})
    with pytest.raises(ConflictError, match="disable withdrawals"):
        await adapter.submit(
            {**ACCOUNT, "venue": "binance"},
            {**ORDER, "instrument": {**ORDER["instrument"], "venue": "binance"}},
        )
    assert not any(method == "POST" for method, _, _ in calls)


async def test_cancel_is_not_assumed_until_broker_lookup_confirms():
    original, calls = broker()

    async def call(method, path, args):
        if method == "DELETE":
            calls.append((method, path, args))
            return {"accepted": True}
        if method == "GET" and path == "/api/v3/order":
            calls.append((method, path, args))
            raise TimeoutError("synthetic lookup timeout")
        return await original(method, path, args)

    with pytest.raises(TimeoutError):
        await BinanceSpotAdapter(call, CONFIG).cancel(ACCOUNT, {**ORDER, "broker_order_id": "44"})
    assert [method for method, path, _ in calls if path == "/api/v3/order"] == ["DELETE", "GET"]


async def test_ambiguous_submit_timeout_does_not_retry_order():
    original, calls = broker()

    async def call(method, path, args):
        if method == "POST":
            calls.append((method, path, args))
            raise TimeoutError("synthetic order timeout")
        return await original(method, path, args)

    with pytest.raises(TimeoutError):
        await BinanceSpotAdapter(call, CONFIG).submit(ACCOUNT, ORDER)
    assert len([1 for method, _, _ in calls if method == "POST"]) == 1
