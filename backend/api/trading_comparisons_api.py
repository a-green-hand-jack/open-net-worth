"""Owner controls for comparable trading scenarios."""

from fastapi import APIRouter, Query

from backend.api.trading_book_api import TradingRoute
from backend.models.trading import ComparisonCreate
from backend.services.trading import comparisons

router = APIRouter(prefix="/api/trading/comparisons", tags=["Trading"], route_class=TradingRoute)


@router.get("")
def list_comparisons(limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0)):
    return comparisons.list_comparisons(limit=limit, offset=offset)


@router.post("", status_code=201)
def create_comparison(body: ComparisonCreate):
    return comparisons.create_comparison(body.model_dump(mode="json"))


@router.get("/{comparison_id}")
def get_comparison(comparison_id: str):
    return comparisons.get_comparison(comparison_id)
