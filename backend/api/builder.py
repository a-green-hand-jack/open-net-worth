"""Auth-gated human API for the Open Net Worth Builder workspace."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.services.builder import (
    ActiveRunError,
    BuilderValidationError,
    EngineUnavailableError,
    RunNotFoundError,
    builder_manager,
)

router = APIRouter()


def _builder_error(exc, status: int):
    if exc.message_id:
        return JSONResponse(
            status_code=status,
            content={
                "detail": str(exc),
                "message_id": exc.message_id,
                "message_params": exc.message_params,
            },
        )
    return JSONResponse(status_code=status, content={"detail": str(exc)})


class BuilderRunBody(BaseModel):
    engine: Literal["codex", "claude"]
    mode: Literal["plan", "build"]
    prompt: str


@router.get("/api/builder/status")
def get_builder_status():
    return builder_manager.status()


@router.post("/api/builder/runs")
async def start_builder_run(body: BuilderRunBody):
    try:
        return await builder_manager.start(body.engine, body.mode, body.prompt)
    except BuilderValidationError as exc:
        return _builder_error(exc, 422)
    except (ActiveRunError, EngineUnavailableError) as exc:
        return _builder_error(exc, 409)


@router.get("/api/builder/runs/{run_id}")
def get_builder_run(run_id: str, after: int = Query(default=0, ge=0)):
    try:
        return builder_manager.get(run_id, after=after)
    except RunNotFoundError:
        return JSONResponse(
            status_code=404,
            content={
                "detail": "Builder run not found.",
                "message_id": "builder.error.runNotFound",
                "message_params": {},
            },
        )


@router.delete("/api/builder/runs/{run_id}")
async def stop_builder_run(run_id: str):
    try:
        return await builder_manager.cancel(run_id)
    except RunNotFoundError:
        return JSONResponse(
            status_code=404,
            content={
                "detail": "Builder run not found.",
                "message_id": "builder.error.runNotFound",
                "message_params": {},
            },
        )
