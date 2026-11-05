import asyncio

import pytest
from fastapi import APIRouter, FastAPI
from fastapi.testclient import TestClient

from backend.api.trading_api import TradingRoute
from backend.core.errors import ConflictError
from backend.services.trading.binance_spot import BinanceSpotAdapter
from backend.services.trading.work_records import record_work


def test_trading_error_exposes_only_explicit_presentation_arguments():
    router = APIRouter(route_class=TradingRoute)

    @router.get("/test")
    def fail():
        raise ConflictError(
            "Run must be ready to start",
            message_id="trading.error.run_state_action",
            message_params={
                "expected": "ready",
                "action": "start",
                "access_token": "synthetic-value",
            },
            internal="not exposed",
        )

    app = FastAPI()
    app.include_router(router)
    response = TestClient(app).get("/test")
    assert response.status_code == 409
    assert response.json()["detail"] == {
        "code": "conflict",
        "message": "Run must be ready to start",
        "message_id": "trading.error.run_state_action",
        "message_params": {"expected": "ready", "action": "start", "access_token": "***"},
    }


def test_binance_wallet_refusal_keeps_the_specific_localization_id():
    async def unexpected_call(*_args):
        raise AssertionError("a refused allocation must not reach the broker")

    adapter = BinanceSpotAdapter(unexpected_call, {"environment": "testnet"})
    with pytest.raises(ConflictError, match="exclusively allocated") as exc:
        asyncio.run(adapter.inspect_account({}))
    assert exc.value.context["message_id"] == "trading.error.binance_whole_wallet"


def test_work_record_validation_exposes_stable_id_without_changing_english():
    router = APIRouter(route_class=TradingRoute)

    @router.get("/work")
    def invalid_work():
        return record_work("synthetic", "unsupported", {})

    app = FastAPI()
    app.include_router(router)
    response = TestClient(app).get("/work")
    assert response.status_code == 422
    assert response.json()["detail"]["message"] == "Unsupported executor work event kind"
    assert response.json()["detail"]["message_id"] == "trading.error.work_kind_unsupported"
