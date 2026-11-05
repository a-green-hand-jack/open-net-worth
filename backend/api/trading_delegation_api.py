"""Owner control plane for reviewing and managing trading delegations."""

from fastapi import APIRouter, HTTPException, Query
from fastapi.routing import APIRoute

from backend.core.errors import OpenNetWorthError, to_http_status
from backend.models.trading import (
    DelegationActivation,
    DelegationCreate,
    MandateAmendment,
    RunAction,
)
from backend.services.trading import delegation
from backend.services.trading.work_records import get_work_record, workspace_files


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


@router.post("/delegations/review")
def review(body: DelegationCreate):
    return delegation.review_delegation(body.model_dump(mode="json"))


@router.post("/delegations", status_code=201)
async def create(body: DelegationCreate):
    return await delegation.create_delegation(body.model_dump(mode="json"))


@router.post("/workspaces/{workspace_id}/activate", status_code=201)
async def activate(workspace_id: str, body: DelegationActivation):
    return await delegation.activate_delegation(workspace_id, body.model_dump(mode="json"))


@router.get("/workspaces/{workspace_id}/overview")
def overview(workspace_id: str):
    return delegation.workspace_overview(workspace_id)


@router.post("/workspaces/{workspace_id}/amendments")
def amend(workspace_id: str, body: MandateAmendment):
    return delegation.amend_mandate(workspace_id, body.model_dump(mode="json"))


@router.post("/workspaces/{workspace_id}/actions")
async def action(workspace_id: str, body: RunAction):
    return await delegation.workspace_action(workspace_id, body.model_dump(mode="json"))


@router.get("/runs/{run_id}/files")
def files(run_id: str, name: str | None = None, version: int | None = Query(None, ge=1)):
    return workspace_files(run_id, name=name, version=version)


@router.get("/runs/{run_id}/work/{record_id}")
def work_record(run_id: str, record_id: str):
    return get_work_record(run_id, record_id)
