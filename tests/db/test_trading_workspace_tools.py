"""Scoped workspace tools run through the actual participant gateway."""

import asyncio
import json

import pytest
from fastapi.testclient import TestClient

from backend.services import tool_permissions
from backend.services.trading import delegation
from backend.services.trading_access import issue_access, revoke_access


@pytest.fixture
def setup_run(db_isolated):
    result = asyncio.run(
        delegation.create_delegation(
            {
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
        )
    )
    for name in ("write_trading_file", "read_trading_files", "record_trading_work"):
        tool_permissions.set_tool_permission("core", name, "always_allow")
    return result["run"]["id"]


def rpc(client, run, token, name, arguments):
    return client.post(
        f"/api/trading/gateway/{run}",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {"name": name, "arguments": arguments},
        },
    )


def unpack(response):
    assert response.status_code == 200
    result = response.json()["result"]
    assert result["isError"] is False
    return json.loads(result["content"][0]["text"])


def test_gateway_versions_files_and_records_work(setup_run):
    from backend.main import app

    run = setup_run
    client = TestClient(app)
    grant = issue_access(run)
    args = {"name": "research/notes.md", "content": "Synthetic research"}
    first = unpack(rpc(client, run, grant["token"], "write_trading_file", args))
    repeated = unpack(rpc(client, run, grant["token"], "write_trading_file", args))
    assert first["event_id"] == repeated["event_id"]
    assert first["version"] == 1
    args["content"] = "Revised synthetic research"
    second = unpack(rpc(client, run, grant["token"], "write_trading_file", args))
    assert second["version"] == 2
    saved = unpack(
        rpc(
            client,
            run,
            grant["token"],
            "read_trading_files",
            {"name": "research/notes.md", "version": 1},
        )
    )
    assert saved["content"] == "Synthetic research"
    work = unpack(
        rpc(
            client,
            run,
            grant["token"],
            "record_trading_work",
            {"kind": "output", "payload": {"text": "Synthetic result"}},
        )
    )
    assert work["kind"] == "agent_output"
    revoke_access(run)
    assert rpc(client, run, grant["token"], "read_trading_files", {}).status_code == 401


def test_gateway_refuses_traversal_rebinding_and_blocked_write(setup_run):
    from backend.main import app

    run = setup_run
    client = TestClient(app)
    token = issue_access(run)["token"]
    traversal = rpc(
        client, run, token, "write_trading_file", {"name": "../outside", "content": "Synthetic"}
    )
    assert traversal.json()["result"]["isError"] is True
    extra = rpc(client, run, token, "read_trading_files", {"run_id": "other"})
    assert extra.json()["result"]["isError"] is True
    tool_permissions.set_tool_permission("core", "write_trading_file", "blocked")
    denied = rpc(
        client, run, token, "write_trading_file", {"name": "safe.md", "content": "Synthetic"}
    )
    assert denied.json()["result"]["isError"] is True
