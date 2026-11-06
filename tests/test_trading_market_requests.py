"""Current market subscriptions must stay within the reviewed mandate."""

import pytest

from backend.core.errors import ConflictError, ValidationError
from backend.services.trading.market_requests import _validate_requested, market_instruments

ACME = {"symbol": "ACME", "venue": "simulation", "asset_class": "stock", "currency": "USD"}


def run():
    return {
        "workspace_snapshot": {
            "mandate": {"allowed_asset_classes": ["stock"], "instruments": [ACME]}
        },
        "accounts": [{"venue": "simulation", "currency": "USD"}],
        "observations": [],
    }


def test_requested_instrument_must_be_inside_reviewed_universe():
    _validate_requested(run(), [ACME])
    with pytest.raises(ConflictError, match="mandate universe"):
        _validate_requested(run(), [{**ACME, "symbol": "OTHER"}])
    with pytest.raises(ConflictError, match="asset class"):
        _validate_requested(run(), [{**ACME, "asset_class": "crypto"}])


def test_subscription_filters_instruments_against_allocated_accounts():
    current = run()
    current["workspace_snapshot"]["mandate"]["instruments"] = []
    current["subscribed_instruments"] = [ACME, {**ACME, "venue": "other"}]
    assert market_instruments(current) == [ACME]


def test_unrestricted_universe_still_checks_account_and_symbol():
    current = run()
    current["workspace_snapshot"]["mandate"]["instruments"] = []
    with pytest.raises(ConflictError, match="venue and currency"):
        _validate_requested(current, [{**ACME, "venue": "other"}])
    with pytest.raises(ValidationError, match="symbol"):
        _validate_requested(current, [{**ACME, "symbol": "../not valid"}])
