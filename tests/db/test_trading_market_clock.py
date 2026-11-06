"""Historical market data and quote authority stay bound to the simulated clock."""

from datetime import datetime, timezone

import pytest

from backend.core.errors import ConflictError, ValidationError
from backend.db.trading_store import TradingStore
from backend.models.trading import Observation
from backend.services.trading import market
from backend.services.trading.quote_authority import quote_is_authorized

INSTRUMENT = {"symbol": "ACME", "venue": "simulation", "asset_class": "stock", "currency": "USD"}
T0 = "2026-01-05T14:30:00+00:00"
T1 = "2026-01-05T14:31:00+00:00"
T2 = "2026-01-05T14:32:00+00:00"


def observation(timestamp, *, available_at=None, price="100"):
    return Observation.model_validate(
        {
            "instrument": INSTRUMENT,
            "timestamp": timestamp,
            "available_at": available_at,
            "price": price,
        }
    ).model_dump(mode="json")


def run(mode="backtest"):
    return {
        "id": "run_synthetic",
        "scope_id": "workspace_synthetic",
        "workspace_id": "workspace_synthetic",
        "mode": mode,
        "state": "running",
        "current_time": T1,
        "start_at": T0,
        "end_at": T2,
        "data_version": "synthetic-v1",
        "fx_rates": {"USD": "1"},
        "workspace_snapshot": {"revision": 1, "mandate": {"market_data_source": "supplied"}},
        "observations": [observation(T0), observation(T1, available_at=T2), observation(T2)],
    }


def test_backtest_hides_future_and_not_yet_available_observations(db_isolated):
    TradingStore("runs").insert(run())
    result = market.get_market_data("run_synthetic")
    assert result["total"] == 1
    assert market.instant(result["items"][0]["timestamp"]) == market.instant(T0)
    assert result["data_version"] == "synthetic-v1"
    assert market.instant(
        market.raw_latest_quote(run(), INSTRUMENT)["timestamp"]
    ) == market.instant(T0)


def test_backtest_rejects_dataset_mutation(db_isolated):
    TradingStore("runs").insert(run())
    with pytest.raises(ConflictError):
        market.ingest_observations("run_synthetic", [observation(T0)])


def test_paper_feed_rejects_future_and_rewritten_observations(db_isolated, monkeypatch):
    TradingStore("runs").insert(run("paper"))
    monkeypatch.setattr(market, "now", lambda: T1)
    with pytest.raises(ValidationError):
        market.ingest_observations("run_synthetic", [observation(T2)])
    with pytest.raises(ConflictError):
        market.ingest_observations("run_synthetic", [observation(T0, price="101")])
    assert TradingStore("runs").required("run_synthetic")["observations"][0]["price"] == "100"


def test_paper_feed_records_accepted_observation_and_event(db_isolated, monkeypatch):
    current = run("paper")
    current["observations"] = []
    TradingStore("runs").insert(current)
    monkeypatch.setattr(market, "now", lambda: T1)
    assert market.ingest_observations("run_synthetic", [observation(T0)]) == {"received": 1}
    assert len(TradingStore("runs").required("run_synthetic")["observations"]) == 1
    assert TradingStore("events").list_scope("run_synthetic")[0]["kind"] == "market_data_received"


def test_current_yahoo_quote_requires_matching_currency_time_and_price():
    current = run("paper")
    current["workspace_snapshot"]["mandate"]["market_data_source"] = "yahoo"
    quote = observation(T0)
    assert not quote_is_authorized(current, INSTRUMENT, quote)
    current["market_quote_authority"] = {
        market.instrument_key(INSTRUMENT): {
            "status": "verified",
            "currency": "USD",
            "timestamp": T0,
            "price": "100",
        }
    }
    assert quote_is_authorized(current, INSTRUMENT, quote)
    assert not quote_is_authorized(current, INSTRUMENT, {**quote, "price": "101"})
    assert not quote_is_authorized(current, INSTRUMENT, {**quote, "timestamp": T1})
    current["market_quote_authority"][market.instrument_key(INSTRUMENT)]["currency"] = "EUR"
    assert not quote_is_authorized(current, INSTRUMENT, quote)


def test_candle_requires_consistent_values_and_timezone():
    with pytest.raises(ValueError):
        Observation.model_validate(
            {"instrument": INSTRUMENT, "timestamp": "2026-01-05T14:30:00", "price": 1}
        )
    with pytest.raises(ValueError):
        Observation.model_validate(
            {
                "instrument": INSTRUMENT,
                "timestamp": datetime.now(timezone.utc),
                "price": 1,
                "open": 1,
            }
        )


@pytest.mark.parametrize(
    "changes",
    [
        {"high": "99"},
        {"low": "101"},
        {"close": None},
        {"close": "99"},
        {"available_at": "2026-01-05T14:29:00Z"},
    ],
)
def test_candle_rejects_inconsistent_or_impossible_records(changes):
    candle = {
        "instrument": INSTRUMENT,
        "timestamp": T0,
        "price": "100",
        "open": "95",
        "high": "105",
        "low": "90",
        "close": "100",
        "volume": "50",
        "interval": "1m",
        "source": "synthetic-fixture",
    }
    with pytest.raises(ValueError):
        Observation.model_validate({**candle, **changes})


def test_quote_authority_is_disclosed_without_rewriting_observation(db_isolated):
    current = run("paper")
    current["workspace_snapshot"]["mandate"]["market_data_source"] = "yahoo"
    current["observations"] = [observation(T0)]
    TradingStore("runs").insert(current)
    original = TradingStore("runs").required("run_synthetic")["observations"][0]
    assert (
        market.get_market_series("run_synthetic")["items"][0]["current_quote_authorized"] is False
    )
    authority = {
        market.instrument_key(INSTRUMENT): {
            "status": "verified",
            "currency": "USD",
            "timestamp": T0,
            "price": "100",
        }
    }
    TradingStore("runs").update_by_id("run_synthetic", {"market_quote_authority": authority})
    assert market.get_market_series("run_synthetic")["items"][0]["current_quote_authorized"] is True
    assert TradingStore("runs").required("run_synthetic")["observations"][0] == original


def test_delayed_candle_series_preserves_source_and_availability(db_isolated):
    current = run()
    candle = Observation.model_validate(
        {
            "instrument": INSTRUMENT,
            "timestamp": T0,
            "available_at": T2,
            "price": "100",
            "open": "95",
            "high": "105",
            "low": "90",
            "close": "100",
            "volume": "50",
            "interval": "1m",
            "source": "synthetic-fixture",
        }
    ).model_dump(mode="json")
    current["observations"] = [candle]
    TradingStore("runs").insert(current)
    assert market.get_market_series("run_synthetic")["total"] == 0
    TradingStore("runs").update_by_id("run_synthetic", {"current_time": T2})
    series = market.get_market_series("run_synthetic")
    assert series["candle_count"] == 1
    assert series["items"][0]["source"] == "synthetic-fixture"
    assert market.instant(series["items"][0]["available_at"]) == market.instant(T2)
    assert series["items"][0]["close"] == "100"
