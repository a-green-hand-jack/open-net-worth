"""Move protocol endpoints (contract C8): resumable upload, import, secrets, finish.

Authenticated by the app-wide ``require_auth`` gate (the gateway session in hosted mode, the
API token or password session otherwise) — none of these paths is in ``_deps._EXEMPT``. A move
belongs to the credential that began it (``_owner``); any other caller sees 404. Thin per the
layering rule: validate → one service call → shape the response.

``POST /api/move/secrets/export`` is the sending half of the secrets step: the desktop reads its
own credentials through its local backend (or from a server when moving back) and posts them to
the other side. It is operator-only like ``GET /api/connectors/{id}/secret/{field}``; the values
are never logged and the response is ``no-store``.
"""

from __future__ import annotations

import hashlib
import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from pydantic import BaseModel

from backend.ai import checkpoint as ckpt
from backend.api._deps import _SESSION_COOKIE, _bearer_token
from backend.core.errors import ConflictError, OpenNetWorthError, to_http_status
from backend.core.move_messages import valid_move_message
from backend.core.security import verify_session
from backend.db.auth_store import AuthStore
from backend.services import move, move_secrets, portability, terminal

logger = logging.getLogger(__name__)


class MovePresentationError(HTTPException):
    def __init__(self, status_code: int, detail: object, message_id: str, params: dict):
        if not valid_move_message(message_id, params):
            raise ValueError("unregistered move message or invalid public parameters")
        super().__init__(status_code, detail)
        self.message_id = message_id
        self.message_params = params


class MoveRoute(APIRoute):
    def get_route_handler(self):
        handler = super().get_route_handler()

        async def mapped(request):
            try:
                return await handler(request)
            except MovePresentationError as exc:
                return JSONResponse(
                    status_code=exc.status_code,
                    content={
                        "detail": exc.detail,
                        "message_id": exc.message_id,
                        "message_params": exc.message_params,
                    },
                )

        return mapped


router = APIRouter(route_class=MoveRoute)

_NO_STORE = {"Cache-Control": "no-store"}
_MAX_SECRETS_BYTES = 2 * 1024 * 1024


class BeginBody(BaseModel):
    size: int
    sha256: str


class CommitBody(BaseModel):
    replace: bool = False


class LocalSwitch(BaseModel):
    connectors: list[str] = []
    automations: list[str] = []


def _owner(request: Request) -> str:
    """Who is moving: stable across one credential's requests, different between credentials."""
    state = request.state
    if getattr(state, "gateway_authenticated", False):
        return "gateway"
    if getattr(state, "desktop_authenticated", False):
        return "desktop"
    token = _bearer_token(request) or request.cookies.get(_SESSION_COOKIE)
    return (
        "anon" if token is None else "credential:" + hashlib.sha256(token.encode()).hexdigest()[:24]
    )


def _fail(exc: OpenNetWorthError) -> HTTPException:
    if isinstance(exc, move.MoveTooLarge):
        status, detail = 413, {"message": exc.message, "max_size": exc.max_size}
    elif isinstance(exc, move.MoveNotEmpty):
        status, detail = 409, {"message": exc.message, "code": "not_empty"}
    else:
        status, detail = to_http_status(exc), exc.message or str(exc)
    message_id = exc.context.get("message_id")
    params = exc.context.get("message_params", {})
    if not valid_move_message(message_id, params):
        return HTTPException(status, detail)
    return MovePresentationError(status, detail, message_id, params)


def _require_intent(request: Request) -> None:
    if (
        _bearer_token(request) is None
        and request.headers.get("x-requested-with", "").strip().lower() != "xmlhttprequest"
    ):
        raise HTTPException(403, "missing X-Requested-With header")


def _checkpointed_import(data: bytes) -> dict:
    """The import, wrapped in the same pre-import checkpoint ``POST /api/data/import`` takes."""
    if ckpt._session_turn_active("import"):
        raise ConflictError("an import is already in progress")
    context, token = ckpt.begin_turn(
        session_id="import", anchor_history_len=0, message_preview="Moved book", kind="import"
    )
    try:
        return portability.apply_import(data)
    finally:
        ckpt.end_turn(context, token)


def _require_secrets_principal(request: Request) -> None:
    """Who may read every stored credential: only a caller proving it is the operator, here and now.

    Never a Bearer API token (it also opens phone Shortcuts and MCP clients, and travels through the
    gateway), never loopback trust, never a disabled or unconfigured login, never a gateway
    pass-through. Accepted: this computer's own desktop backend; a gateway session minted in the last
    15 minutes; a self-hosted login cookie.
    """
    state = request.state
    if getattr(state, "desktop_authenticated", False):
        return
    if _bearer_token(request) is not None or getattr(state, "gateway_passthrough", False):
        raise HTTPException(403, "credentials cannot be exported with an API token")
    if terminal.gateway_active():
        if not getattr(state, "gateway_authenticated", False):
            raise HTTPException(403, "sign in to export credentials")
        if not terminal.is_fresh(request):
            raise HTTPException(
                401,
                {
                    "message": "Sign in again to move your keys; your session is more than 15 minutes old.",
                    "code": "fresh_session_required",
                },
            )
        return
    store = AuthStore()
    if not store.is_configured() or store.auth_disabled():
        raise HTTPException(
            403, "credentials can be exported only from a password-protected server"
        )
    cookie = request.cookies.get(_SESSION_COOKIE)
    if not cookie or verify_session(cookie, store.session_key_bytes()) is None:
        raise HTTPException(401, "sign in to export credentials")


@router.post("/api/move/export-nonce")
def export_nonce(request: Request) -> JSONResponse:
    _require_intent(request)
    _require_secrets_principal(request)
    return JSONResponse({"nonce": move.issue_export_nonce(_owner(request))}, headers=_NO_STORE)


@router.post("/api/move/secrets/export")
def export_secrets(request: Request) -> JSONResponse:
    _require_intent(request)
    _require_secrets_principal(request)
    if not move.consume_export_nonce(_owner(request), request.headers.get("x-move-nonce", "")):
        raise HTTPException(403, "missing or expired export token")
    payload = move_secrets.collect()
    logger.info(
        "move secrets exported by %s: %d connectors, %d providers",
        terminal.actor(request) or _owner(request).split(":")[0],
        len(payload["connectors"]),
        len(payload["ai_providers"]),
    )
    return JSONResponse(payload, headers=_NO_STORE)


@router.post("/api/move/begin")
def begin(body: BeginBody, request: Request) -> dict:
    _require_intent(request)
    try:
        return move.begin(_owner(request), body.size, body.sha256)
    except OpenNetWorthError as exc:
        raise _fail(exc) from exc


@router.put("/api/move/{move_id}/parts/{n}", status_code=204)
async def put_part(move_id: str, n: int, request: Request) -> Response:
    _require_intent(request)
    declared = request.headers.get("content-length")
    if declared is not None and declared.isdigit() and int(declared) > move.PART_SIZE:
        raise MovePresentationError(
            413, "part is larger than the part size", "move.part_exceeds_size", {}
        )
    try:
        await move.put_part(
            move_id, _owner(request), n, request.headers.get("x-part-sha256", ""), request.stream()
        )
    except OpenNetWorthError as exc:
        raise _fail(exc) from exc
    except OSError as exc:
        logger.error("move part %s/%d could not be written: %s", move_id, n, type(exc).__name__)
        raise MovePresentationError(
            507,
            "the server could not store the upload (disk full?)",
            "move.upload_storage_failed",
            {},
        ) from exc
    return Response(status_code=204)


@router.get("/api/move/{move_id}")
def get_status(move_id: str, request: Request) -> dict:
    try:
        return move.status(move_id, _owner(request))
    except OpenNetWorthError as exc:
        raise _fail(exc) from exc


@router.post("/api/move/{move_id}/commit")
def commit(move_id: str, body: CommitBody, request: Request) -> dict:
    _require_intent(request)
    try:
        return move.commit(move_id, _owner(request), body.replace, _checkpointed_import)
    except OpenNetWorthError as exc:
        raise _fail(exc) from exc


@router.post("/api/move/{move_id}/secrets")
async def apply_secrets(move_id: str, request: Request) -> JSONResponse:
    _require_intent(request)
    declared = request.headers.get("content-length")
    if declared is not None and declared.isdigit() and int(declared) > _MAX_SECRETS_BYTES:
        raise MovePresentationError(413, "secrets payload too large", "move.secrets_too_large", {})
    chunks: list[bytes] = []
    received = 0
    async for chunk in request.stream():
        received += len(chunk)
        if received > _MAX_SECRETS_BYTES:
            raise MovePresentationError(
                413, "secrets payload too large", "move.secrets_too_large", {}
            )
        chunks.append(chunk)
    raw = b"".join(chunks)
    try:
        payload: Any = json.loads(raw)
    except ValueError as exc:
        raise MovePresentationError(
            422, "secrets payload must be JSON", "move.secrets_json_invalid", {}
        ) from exc
    try:
        result = move.apply_secrets(move_id, _owner(request), payload)
    except OpenNetWorthError as exc:
        raise _fail(exc) from exc
    logger.info(
        "move secrets applied: %d items, %d skipped", len(result["applied"]), len(result["skipped"])
    )
    return JSONResponse(result, headers=_NO_STORE)


@router.post("/api/move/{move_id}/finish")
async def finish(move_id: str, request: Request) -> dict:
    _require_intent(request)
    try:
        result = move.finish(move_id, _owner(request))
    except OpenNetWorthError as exc:
        raise _fail(exc) from exc
    await _reload_live_connections(result["enabled"])
    return result


async def _reload_live_connections(changed: list[str]) -> None:
    """Make the running process match the stored switches: the Telegram bot and any remote MCP server."""
    if "telegram" in changed:
        from backend.connectors.telegram import bot as telegram_bot

        await telegram_bot.reload_best_effort()
    for connector_id in changed:
        if connector_id.startswith("mcp:"):
            from backend.mcp.client_manager import get_manager

            try:
                get_manager().test_connect(connector_id[len("mcp:") :])
            except Exception:
                logger.warning("MCP server %s did not answer after a move", connector_id)


@router.post("/api/move/pause-copy")
async def pause_copy(body: LocalSwitch, request: Request) -> dict:
    """The sender's last step: stop this copy's bots and automations so only one copy runs them."""
    _require_intent(request)
    connectors = move_secrets.pause_connectors(body.connectors)
    automations = move_secrets.pause_automations()
    await _reload_live_connections(connectors)
    return {"connectors": connectors, "automations": automations}


@router.post("/api/move/resume-copy")
async def resume_copy(body: LocalSwitch, request: Request) -> dict:
    """Undo ``pause_local`` exactly (the book is being used on this computer again)."""
    _require_intent(request)
    enabled, failed = move_secrets.enable_connectors(body.connectors)
    resumed = move_secrets.resume_automations(body.automations)
    await _reload_live_connections(enabled)
    return {"connectors": enabled, "could_not_enable": failed, "automations": resumed}


@router.delete("/api/move/{move_id}", status_code=204)
def abort(move_id: str, request: Request) -> Response:
    _require_intent(request)
    try:
        move.abort(move_id, _owner(request))
    except OpenNetWorthError as exc:
        raise _fail(exc) from exc
    return Response(status_code=204)
