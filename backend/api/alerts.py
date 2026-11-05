"""
GET    /api/alerts?ticker=AAPL   — list price alerts (optionally filtered by ticker)
POST   /api/alerts               — create one price alert
PATCH  /api/alerts/{id}          — update an alert's op/value/note/label
DELETE /api/alerts/{id}          — delete an alert

Standalone, ticker-keyed price alerts decoupled from watchlist items (ADR 0014).
Thin router: validate → ONE service call (services.alerts) → shape response.

``name`` is the alert's own short display name (distinct from ``label``, the ticker's).
``kind`` selects what ``value`` means: ``"price"`` (a price level) or ``"move"`` (a percent
threshold on the one-day move vs. the previous close, must be >0 and <=100).
``channels`` is where the fired alert is also sent (channel ids; ``[]`` = in-app only). Omitted
on create → the user's price-alert default from Settings › Notifications.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from backend.core.errors import NotFoundError, OpenNetWorthError, ValidationError
from backend.services import alerts as alerts_service

router = APIRouter()
_ALERT_MESSAGE_PARAMS = json.loads(
    (Path(__file__).resolve().parents[1] / "core/alert_message_contract.json").read_text()
)


def _alert_error(exc: OpenNetWorthError, status_code: int):
    message_id = exc.context.get("message_id")
    params = exc.context.get("message_params", {})
    if (
        isinstance(message_id, str)
        and message_id in _ALERT_MESSAGE_PARAMS
        and isinstance(params, dict)
        and set(params) == set(_ALERT_MESSAGE_PARAMS[message_id])
    ):
        return JSONResponse(
            status_code=status_code,
            content={"detail": str(exc), "message_id": message_id, "message_params": params},
        )
    raise HTTPException(status_code=status_code, detail=str(exc)) from exc


# Bound free-text fields: `note` is injected verbatim into the fired-alert LLM prompt
# ("instructions for Lucius"), so cap it (defense-in-depth — single-user, but cheap).
_NOTE_MAX = 2000
_NAME_MAX = 64


class AlertCreate(BaseModel):
    ticker: str = Field(max_length=_NAME_MAX)
    op: Literal[">=", "<=", ">", "<"]
    value: float
    note: str = Field("", max_length=_NOTE_MAX)  # "Instructions for Lucius" when the alert fires
    label: str = Field("", max_length=_NAME_MAX)
    name: str = Field("", max_length=_NAME_MAX)  # the alert's OWN display name, distinct from label
    kind: Literal["price", "move"] = "price"
    channels: Optional[list[str]] = Field(default=None, max_length=8)
    asset_class: str = Field("equity", max_length=_NAME_MAX)
    instrument_id: str = Field("", max_length=_NAME_MAX)
    # What happens after this alert fires once — go quiet for cooldown_minutes and re-arm, or
    # turn off until manually re-enabled. Default is a 24h (1440min) cooldown.
    on_trigger: Literal["cooldown", "disable"] = "cooldown"
    cooldown_minutes: int = Field(1440, ge=0, le=10080)


class AlertPatch(BaseModel):
    op: Optional[Literal[">=", "<=", ">", "<"]] = None
    value: Optional[float] = None
    note: Optional[str] = Field(default=None, max_length=_NOTE_MAX)
    label: Optional[str] = Field(default=None, max_length=_NAME_MAX)
    name: Optional[str] = Field(default=None, max_length=_NAME_MAX)
    kind: Optional[Literal["price", "move"]] = None
    channels: Optional[list[str]] = Field(default=None, max_length=8)
    asset_class: Optional[str] = Field(default=None, max_length=_NAME_MAX)
    on_trigger: Optional[Literal["cooldown", "disable"]] = None
    cooldown_minutes: Optional[int] = Field(default=None, ge=0, le=10080)
    # The explicit "turn this alert back on" action for a disable-mode alert that has fired.
    enabled: Optional[bool] = None


@router.get("/api/alerts")
def list_alerts(ticker: Optional[str] = Query(default=None)):
    return {"alerts": alerts_service.list_alerts(ticker)}


@router.post("/api/alerts", status_code=201)
def create_alert(body: AlertCreate):
    try:
        return alerts_service.apply_alert_change({"type": "create", **body.model_dump()})
    except ValidationError as exc:
        return _alert_error(exc, 422)


@router.patch("/api/alerts/{alert_id}")
def update_alert(alert_id: str, body: AlertPatch):
    changes = body.model_dump(exclude_none=True)
    try:
        return alerts_service.apply_alert_change({"type": "update", "id": alert_id, **changes})
    except NotFoundError as exc:
        return _alert_error(exc, 404)
    except ValidationError as exc:
        return _alert_error(exc, 422)


@router.delete("/api/alerts/{alert_id}")
def delete_alert(alert_id: str):
    try:
        return alerts_service.apply_alert_change({"type": "delete", "id": alert_id})
    except NotFoundError as exc:
        return _alert_error(exc, 404)
