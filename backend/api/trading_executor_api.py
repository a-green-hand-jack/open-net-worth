"""Owner-only controls for a trading executor and its billing receipt."""

from decimal import Decimal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from backend.core.errors import OpenNetWorthError, to_http_status
from backend.core.trading_runtime import run_trading_agent
from backend.services.trading_scripts import execute_strategy
from backend.services.trading_usage import reconcile_usage

router = APIRouter()


class AgentCycle(BaseModel):
    model_config = ConfigDict(extra="forbid")
    model: str | None = None
    effort: str = "medium"


class StrategySource(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source: str = Field(min_length=1, max_length=64000)


class UsageReceipt(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    receipt_id: str = Field(min_length=1, max_length=120)
    turn_id: str | None = None
    additional_cost_usd: Decimal = Field(ge=0)


@router.post("/api/trading/runs/{run_id}/usage-reconciliation")
def reconcile_billing(run_id: str, body: UsageReceipt):
    try:
        return reconcile_usage(run_id, **body.model_dump())
    except OpenNetWorthError as exc:
        raise HTTPException(to_http_status(exc), exc.message) from exc


@router.post("/api/trading/runs/{run_id}/agent")
async def agent_cycle(run_id: str, body: AgentCycle):
    try:
        return await run_trading_agent(run_id, model=body.model, effort=body.effort)
    except OpenNetWorthError as exc:
        raise HTTPException(to_http_status(exc), exc.message) from exc


@router.post("/api/trading/runs/{run_id}/script")
async def strategy_cycle(run_id: str, body: StrategySource):
    try:
        return await execute_strategy(run_id, body.source)
    except OpenNetWorthError as exc:
        raise HTTPException(to_http_status(exc), exc.message) from exc
