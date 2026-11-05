"""Exercise the trading gateway with synthetic runs and scoped access only."""

import asyncio
import json
from types import SimpleNamespace

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from backend.ai.tools import execute_tool
from backend.api._deps import require_auth
from backend.core.trading_runtime import bind_trading_context, trading_context
from backend.mcp.trading_gateway import router
from backend.services import tool_permissions
from backend.services.trading import delegation
from backend.services.trading_access import issue_access, revoke_access


@pytest.fixture
def run(db_isolated):
    data = {
        "workspace": {"name": "Synthetic"},
        "environment": {
            "mode": "backtest",
            "start_at": "2026-01-05T14:30:00Z",
            "end_at": "2026-01-05T15:00:00Z",
            "accounts": [{"capital": "1000"}],
            "observations": [
                {
                    "instrument": {"symbol": "ACME"},
                    "timestamp": "2026-01-05T14:30:00Z",
                    "price": "100",
                }
            ],
        },
    }
    return asyncio.run(delegation.create_delegation(data))["run"]["id"]


@pytest.fixture
def client():
    app = FastAPI(dependencies=[Depends(require_auth)])
    app.include_router(router)
    return TestClient(app)


def rpc(client, run_id, token, name, arguments=None):
    return client.post(
        f"/api/trading/gateway/{run_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {"name": name, "arguments": arguments or {}},
        },
    )


def test_gateway_requires_own_scoped_grant_and_no_store(run, client):
    assert rpc(client, run, "invalid", "get_trading_environment").status_code == 401
    grant = issue_access(run)
    response = rpc(client, run, grant["token"], "get_trading_environment")
    assert response.status_code == 200
    assert json.loads(response.json()["result"]["content"][0]["text"])["run_id"] == run
    assert "no-store" in response.headers["cache-control"]
    revoke_access(run)
    assert rpc(client, run, grant["token"], "get_trading_environment").status_code == 401


def test_gateway_is_mounted_on_the_actual_application(run):
    from backend.main import app

    grant = issue_access(run)
    response = rpc(TestClient(app), run, grant["token"], "get_trading_environment")
    assert response.status_code == 200
    assert json.loads(response.json()["result"]["content"][0]["text"])["run_id"] == run


def test_gateway_refuses_general_tools_and_rebinding(run, client):
    grant = issue_access(run)
    assert (
        rpc(client, run, grant["token"], "run_sql_query", {"query": "select 1"}).json()["error"][
            "code"
        ]
        == -32602
    )
    response = rpc(
        client, run, grant["token"], "get_trading_environment", {"run_id": "other", "mode": "live"}
    )
    assert response.json()["result"]["isError"] is True


def test_scoped_grant_does_not_authorize_operator_control_plane(run, monkeypatch):
    from backend.db.auth_store import AuthStore

    monkeypatch.setattr(AuthStore, "auth_disabled", lambda self: False)
    monkeypatch.setattr(AuthStore, "api_token", lambda self: "different-synthetic-operator-token")
    monkeypatch.setattr("backend.api._deps.demo_open_access_active", lambda: False)
    app = FastAPI(dependencies=[Depends(require_auth)])

    @app.post("/api/synthetic-control")
    def control():
        return {"ok": True}

    grant = issue_access(run)
    response = TestClient(app).post(
        "/api/synthetic-control", headers={"Authorization": f"Bearer {grant['token']}"}
    )
    assert response.status_code == 401


def test_global_blocked_tool_permission_cannot_be_bypassed(run, client):
    grant = issue_access(run)
    tool_permissions.set_tool_permission("core", "get_trading_environment", "blocked")
    response = rpc(client, run, grant["token"], "get_trading_environment")
    assert response.json()["result"]["isError"] is True


def test_bound_dispatch_cannot_call_general_tools(run):
    with bind_trading_context(run, "external"):
        text, proposed = asyncio.run(execute_tool("run_sql_query", {"query": "select 1"}))
    assert proposed is None
    assert "only its scoped trading tools" in json.loads(text)["error"]
    assert trading_context() is None


def test_public_demo_refuses_gateway_even_with_valid_grant(run, client, monkeypatch):
    grant = issue_access(run)
    monkeypatch.setattr(
        "backend.api.demo_lockdown.get_settings", lambda: SimpleNamespace(demo_mode=True)
    )
    assert rpc(client, run, grant["token"], "get_trading_environment").status_code == 403


def test_gateway_limits_body_and_request_rate(run, client, monkeypatch):
    from backend.core.ratelimit import SlidingWindowLimiter
    from backend.mcp import trading_gateway

    grant = issue_access(run)
    monkeypatch.setattr(trading_gateway, "request_limiter", SlidingWindowLimiter(1, 60))
    assert rpc(client, run, grant["token"], "get_trading_environment").status_code == 200
    assert rpc(client, run, grant["token"], "get_trading_environment").status_code == 429
    monkeypatch.setattr(trading_gateway, "request_limiter", SlidingWindowLimiter(10, 60))
    response = client.post(
        f"/api/trading/gateway/{run}",
        headers={"Authorization": f"Bearer {grant['token']}"},
        content=b"x" * (trading_gateway.MAX_BODY + 1),
    )
    assert response.status_code == 413
