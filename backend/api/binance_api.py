"""Human-only native Binance configuration and read-only account verification."""

from fastapi import APIRouter, HTTPException, Response

from backend.core.errors import OpenNetWorthError, to_http_status
from backend.models.binance import BinanceConfigUpdate
from backend.services import binance_connector

router = APIRouter()


@router.get("/api/binance/status")
def binance_status(response: Response):
    response.headers["Cache-Control"] = "no-store"
    return binance_connector.status()


@router.put("/api/binance/config")
async def binance_config(body: BinanceConfigUpdate, response: Response):
    response.headers["Cache-Control"] = "no-store"
    try:
        return await binance_connector.configure(body.model_dump())
    except OpenNetWorthError as exc:
        raise HTTPException(to_http_status(exc), exc.message) from exc


@router.post("/api/binance/test")
async def binance_test(response: Response):
    response.headers["Cache-Control"] = "no-store"
    try:
        return await binance_connector.test_connection()
    except OpenNetWorthError as exc:
        raise HTTPException(to_http_status(exc), exc.message) from exc
