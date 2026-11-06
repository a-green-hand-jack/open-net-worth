"""Human control plane and read projections for autonomous trading workspaces."""

from fastapi import APIRouter, Body, HTTPException, Query
from fastapi.routing import APIRoute

from backend.core.errors import OpenNetWorthError, to_http_status
from backend.models.trading import (
    Decision,
    OrderIntent,
    RunAction,
    RunCreate,
    WorkspaceCreate,
)
from backend.services.trading import activity, execution, lifecycle, market
from backend.services.trading import performance as performance_service
from backend.services.trading import workspaces as workspace_service


class TradingRoute(APIRoute):
    def get_route_handler(self):
        handler = super().get_route_handler()

        async def mapped(request):
            try:
                response = await handler(request)
                response.headers["Cache-Control"] = "no-store"
                return response
            except OpenNetWorthError as exc:
                raise HTTPException(
                    to_http_status(exc), {"code": exc.code, "message": exc.message}
                ) from exc

        return mapped


router = APIRouter(prefix="/api/trading", tags=["Trading"], route_class=TradingRoute)


@router.get("/workspaces")
def workspaces(limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0)):
    return workspace_service.list_workspaces(limit=limit, offset=offset)


@router.post("/workspaces", status_code=201)
def create_workspace(body: WorkspaceCreate):
    return workspace_service.create_workspace(body.model_dump(mode="json"))


@router.get("/workspaces/{workspace_id}")
def workspace(workspace_id: str):
    return workspace_service.get_workspace(workspace_id)


@router.patch("/workspaces/{workspace_id}")
def update_workspace(workspace_id: str, body: dict = Body(...)):
    return workspace_service.update_workspace(workspace_id, body)


@router.get("/workspaces/{workspace_id}/runs")
def workspace_runs(
    workspace_id: str, limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0)
):
    return workspace_service.list_runs(workspace_id, limit=limit, offset=offset)


@router.post("/workspaces/{workspace_id}/runs", status_code=201)
def create_run(workspace_id: str, body: RunCreate):
    return workspace_service.create_run(workspace_id, body.model_dump(mode="json"))


@router.get("/runs")
def runs(
    workspace_id: str | None = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    return workspace_service.list_runs(workspace_id, limit=limit, offset=offset)


@router.get("/runs/{run_id}")
def run(run_id: str):
    return workspace_service.get_run(run_id)


@router.post("/runs/{run_id}/actions")
async def action(run_id: str, body: RunAction):
    return await lifecycle.apply_run_action(run_id, body.model_dump(mode="json"))


@router.get("/runs/{run_id}/environment")
def environment(run_id: str):
    return market.get_environment(run_id)


@router.get("/runs/{run_id}/accounts")
def accounts(run_id: str):
    return performance_service.get_account(run_id)


@router.get("/runs/{run_id}/market-data")
def market_data(run_id: str, limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0)):
    return market.get_market_data(run_id, limit=limit, offset=offset)


@router.post("/runs/{run_id}/observations")
def observations(run_id: str, body: list[dict] = Body(...)):
    return market.ingest_observations(run_id, body)


@router.get("/runs/{run_id}/orders")
def orders(run_id: str, limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0)):
    return execution.list_orders(run_id, limit=limit, offset=offset)


@router.post("/runs/{run_id}/orders", status_code=201)
async def submit_order(run_id: str, body: OrderIntent):
    return await execution.submit_order(run_id, body.model_dump(mode="json"))


@router.delete("/runs/{run_id}/orders/{order_id}")
async def cancel_order(run_id: str, order_id: str):
    return await execution.cancel_order(run_id, order_id)


@router.get("/runs/{run_id}/fills")
def fills(run_id: str, limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0)):
    return execution.list_fills(run_id, limit=limit, offset=offset)


@router.get("/runs/{run_id}/events")
def events(
    run_id: str,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    after: int | None = Query(None, ge=0),
):
    return activity.list_events(run_id, limit=limit, offset=offset, after=after)


@router.post("/runs/{run_id}/decisions", status_code=201)
def decision(run_id: str, body: Decision):
    return activity.record_decision(run_id, body.model_dump(mode="json"))


@router.get("/runs/{run_id}/performance")
def performance(run_id: str):
    return performance_service.get_performance(run_id)
