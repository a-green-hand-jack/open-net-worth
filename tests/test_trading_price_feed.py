import pytest

from backend.core.errors import ConflictError
from backend.services.trading import price_feed


@pytest.fixture(autouse=True)
def no_market_network(monkeypatch):
    monkeypatch.setattr(price_feed.prices, "fetch_history_result", lambda *_: {"points": []})
    monkeypatch.setattr(price_feed, "record_quote_authority", lambda *_: {})


def configured_run(mode="paper"):
    return {
        "mode": mode,
        "observations": [],
        "accounts": [{"venue": "simulation", "currency": "USD"}],
        "workspace_snapshot": {
            "mandate": {
                "market_data_source": "yahoo",
                "allowed_asset_classes": ["stock", "crypto"],
                "instruments": [
                    {
                        "symbol": "EXAMPLE/USD",
                        "venue": "simulation",
                        "asset_class": "crypto",
                        "currency": "USD",
                    },
                ],
            }
        },
    }


def test_backtest_never_reaches_current_price_provider(monkeypatch):
    monkeypatch.setattr(price_feed, "_feed_snapshot", lambda _: configured_run("backtest"))
    monkeypatch.setattr(
        price_feed.prices, "fetch_yahoo_quotes", lambda *_: pytest.fail("future-data leak")
    )
    with pytest.raises(ConflictError, match="Historical"):
        price_feed.refresh_run_market_data("synthetic")


def test_feed_preserves_provider_quote_time_instead_of_making_it_fresh(monkeypatch):
    captured = []
    monkeypatch.setattr(price_feed, "_feed_snapshot", lambda _: configured_run())
    monkeypatch.setattr(price_feed, "record_activity", lambda *_: None)
    monkeypatch.setattr(
        price_feed,
        "ingest_observations",
        lambda _, rows: captured.extend(rows) or {"received": len(rows)},
    )
    monkeypatch.setattr(
        price_feed.prices,
        "fetch_yahoo_quotes",
        lambda symbols: {
            "prices": {symbols[0]: 10},
            "as_of": {symbols[0]: "2026-01-05T15:00:00Z"},
            "currencies": {symbols[0]: "USD"},
            "timestamp_verified": {symbols[0]: True},
        },
    )
    assert price_feed.refresh_run_market_data("synthetic")["received"] == 1
    assert captured[0]["timestamp"] == "2026-01-05T15:00:00Z"
    assert captured[0]["available_at"] != captured[0]["timestamp"]


def test_missing_provider_timestamp_does_not_create_a_tradeable_observation(monkeypatch):
    monkeypatch.setattr(price_feed, "_feed_snapshot", lambda _: configured_run())
    monkeypatch.setattr(price_feed, "record_activity", lambda *_: None)
    monkeypatch.setattr(
        price_feed, "ingest_observations", lambda *_: pytest.fail("invented timestamp")
    )
    monkeypatch.setattr(
        price_feed.prices, "fetch_yahoo_quotes", lambda symbols: {"prices": {symbols[0]: 10}}
    )
    result = price_feed.refresh_run_market_data("synthetic")
    assert result["received"] == 0
    assert result["missing"] == ["EXAMPLE-USD"]


def test_feed_captures_actual_provider_bars_but_not_incomplete_or_naive_time_bars(monkeypatch):
    from datetime import datetime, timedelta, timezone

    captured = []
    current = datetime.now(timezone.utc)
    monkeypatch.setattr(price_feed, "_feed_snapshot", lambda _: configured_run())
    monkeypatch.setattr(price_feed, "record_activity", lambda *_: None)
    monkeypatch.setattr(
        price_feed,
        "ingest_observations",
        lambda _, rows: captured.extend(rows) or {"received": len(rows)},
    )
    monkeypatch.setattr(
        price_feed.prices, "fetch_yahoo_quotes", lambda _: {"currencies": {"EXAMPLE-USD": "USD"}}
    )
    monkeypatch.setattr(
        price_feed.prices,
        "fetch_history_result",
        lambda *_: {
            "points": [
                {"date": date, "open": 9, "high": 11, "low": 8, "close": 10, "volume": 100}
                for date in (
                    (current - timedelta(minutes=10)).isoformat(),
                    current.isoformat(),
                    "2026-01-01",
                )
            ]
        },
    )
    assert price_feed.refresh_run_market_data("synthetic")["received"] == 1
    assert captured[0]["source"] == "yahoo"
    assert captured[0]["open"] == "9"
    assert captured[0]["price"] == captured[0]["close"] == "10"
    assert captured[0]["available_at"] == captured[0]["received_at"]


def test_bar_failure_does_not_discard_a_valid_quote(monkeypatch):
    captured, events = [], []
    monkeypatch.setattr(price_feed, "_feed_snapshot", lambda _: configured_run())
    monkeypatch.setattr(price_feed, "record_activity", lambda *args: events.append(args))
    monkeypatch.setattr(
        price_feed,
        "ingest_observations",
        lambda _, rows: captured.extend(rows) or {"received": len(rows)},
    )
    monkeypatch.setattr(
        price_feed.prices,
        "fetch_yahoo_quotes",
        lambda symbols: {
            "prices": {symbols[0]: 10},
            "as_of": {symbols[0]: "2026-01-05T15:00:00Z"},
            "currencies": {symbols[0]: "USD"},
            "timestamp_verified": {symbols[0]: True},
        },
    )

    def unavailable(*_):
        raise TimeoutError("synthetic provider failure")

    monkeypatch.setattr(price_feed.prices, "fetch_history_result", unavailable)
    assert price_feed.refresh_run_market_data("synthetic")["received"] == 1
    assert captured[0]["source"] == "yahoo"
    assert captured[0]["received_at"]
    assert events[0][1] == "market_bars_unavailable"


@pytest.mark.parametrize("currency", ["GBP", "GBp", "EUR", "usd", None])
def test_caller_usd_label_cannot_relabel_foreign_or_unknown_provider_currency(
    monkeypatch, currency
):
    from datetime import datetime, timezone

    captured = []
    monkeypatch.setattr(price_feed, "_feed_snapshot", lambda _: configured_run())
    monkeypatch.setattr(price_feed, "record_activity", lambda *_: None)
    monkeypatch.setattr(
        price_feed,
        "ingest_observations",
        lambda _, rows: captured.extend(rows) or {"received": len(rows)},
    )
    monkeypatch.setattr(
        price_feed.prices,
        "fetch_yahoo_quotes",
        lambda symbols: {
            "prices": {symbols[0]: 75},
            "as_of": {symbols[0]: datetime.now(timezone.utc).isoformat()},
            "currencies": {symbols[0]: currency},
            "timestamp_verified": {symbols[0]: True},
        },
    )
    monkeypatch.setattr(
        price_feed.prices,
        "fetch_history_result",
        lambda *_: pytest.fail("Unproven currency must not reach the historical-price importer"),
    )
    result = price_feed.refresh_run_market_data("synthetic")
    assert result["status"] == "unavailable"
    assert "currency" in result["rejected"]["EXAMPLE-USD"]
    assert captured == []


@pytest.mark.parametrize("verified", [False, None, "true"])
def test_retrieval_time_cannot_substitute_for_unverified_observation_time(monkeypatch, verified):
    from datetime import datetime, timezone

    monkeypatch.setattr(price_feed, "_feed_snapshot", lambda _: configured_run())
    monkeypatch.setattr(price_feed, "record_activity", lambda *_: None)
    monkeypatch.setattr(
        price_feed,
        "ingest_observations",
        lambda *_: pytest.fail("An unverified timestamp became tradeable"),
    )
    monkeypatch.setattr(
        price_feed.prices,
        "fetch_yahoo_quotes",
        lambda symbols: {
            "prices": {symbols[0]: 75},
            "as_of": {symbols[0]: datetime.now(timezone.utc).isoformat()},
            "currencies": {symbols[0]: "USD"},
            "timestamp_verified": {symbols[0]: verified},
        },
    )
    result = price_feed.refresh_run_market_data("synthetic")
    assert result["status"] == "unavailable"
    assert result["rejected"]["EXAMPLE-USD"] in {
        "Provider quote currency is unavailable",
        "Provider observation time is not verified; retrieval time is not a quote timestamp",
    }


def test_real_quote_facade_fallback_does_not_enter_trading_feed(monkeypatch):
    from datetime import datetime, timezone

    monkeypatch.setattr(price_feed, "_feed_snapshot", lambda _: configured_run())
    monkeypatch.setattr(price_feed, "record_activity", lambda *_: None)
    monkeypatch.setattr(
        price_feed,
        "ingest_observations",
        lambda *_: pytest.fail("Facade fallback became a tradeable observation"),
    )
    monkeypatch.setattr(price_feed.prices, "_cache_market_from_quotes", lambda *_: None)
    monkeypatch.setattr(price_feed.prices, "_extended_hours_from_quote", lambda *_: {})
    monkeypatch.setattr(
        price_feed.prices,
        "_yf_batch_quote",
        lambda _: {
            "EXAMPLE-USD": {
                "regularMarketPrice": None,
                "regularMarketTime": int(datetime.now(timezone.utc).timestamp()),
                "currency": "USD",
            }
        },
    )
    monkeypatch.setattr(price_feed.prices, "_fetch_one", lambda symbol: (symbol, 75, 74))
    result = price_feed.refresh_run_market_data("synthetic")
    assert result["status"] == "unavailable"
    assert result["rejected"]["EXAMPLE-USD"] in {
        "Provider quote currency is unavailable",
        "Provider observation time is not verified; retrieval time is not a quote timestamp",
    }
