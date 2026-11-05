"""Owner control plane for trading participant grants."""

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field

from backend.core.errors import OpenNetWorthError, to_http_status
from backend.services.trading_access import issue_access, revoke_access

router = APIRouter()


class AccessRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expires_in_seconds: int = Field(default=3600, ge=60, le=86400)


@router.post("/api/trading/runs/{run_id}/access")
def grant_access(run_id: str, body: AccessRequest, response: Response):
    response.headers["Cache-Control"] = "no-store"
    try:
        return issue_access(run_id, body.expires_in_seconds)
    except OpenNetWorthError as exc:
        raise HTTPException(to_http_status(exc), exc.message) from exc


@router.delete("/api/trading/runs/{run_id}/access")
def remove_access(run_id: str, response: Response):
    response.headers["Cache-Control"] = "no-store"
    try:
        return revoke_access(run_id)
    except OpenNetWorthError as exc:
        raise HTTPException(to_http_status(exc), exc.message) from exc
