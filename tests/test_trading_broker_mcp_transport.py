"""Synthetic receipts exercise the unattended broker MCP permission boundary."""

from types import SimpleNamespace

import pytest

from backend.core.errors import ConflictError
from backend.mcp import client_manager as module


@pytest.fixture
def harness(monkeypatch):
    server = SimpleNamespace(
        id="synthetic-broker",
        enabled=True,
        last_status="ok",
        discovered_tools=[
            {
                "name": "inspect",
                "inputSchema": {
                    "type": "object",
                    "properties": {"id": {"type": "string"}},
                    "required": ["id"],
                    "additionalProperties": False,
                },
            }
        ],
    )
    manager = module.McpClientManager(store=SimpleNamespace(find=lambda _: server))
    monkeypatch.setattr(module.tool_permissions, "get_tool_permission", lambda *_: "always_allow")
    monkeypatch.setattr(module.oauth_flow, "ensure_fresh_token", lambda item: item)
    return manager, server


async def test_valid_schema_and_standing_permission_return_structured_receipt(harness, monkeypatch):
    manager, _ = harness
    calls = []
    monkeypatch.setattr(
        manager,
        "_call_tool_blocking",
        lambda server, tool, args: (calls.append(args) or '{"status":"ok"}', []),
    )
    assert await manager.call_structured_tool("synthetic-broker", "inspect", {"id": "sample"}) == {
        "status": "ok"
    }
    assert calls == [{"id": "sample"}]


@pytest.mark.parametrize("level", ["blocked", "needs_approval", "unknown"])
async def test_unattended_dispatch_requires_standing_permission(harness, monkeypatch, level):
    manager, _ = harness
    monkeypatch.setattr(module.tool_permissions, "get_tool_permission", lambda *_: level)
    monkeypatch.setattr(manager, "_call_tool_blocking", lambda *_: pytest.fail("must not call"))
    with pytest.raises(ConflictError, match="standing permission"):
        await manager.call_structured_tool("synthetic-broker", "inspect", {"id": "sample"})


async def test_revoked_permission_after_refresh_refuses_dispatch(harness, monkeypatch):
    manager, server = harness

    def refresh(value):
        server.enabled = False
        return value

    monkeypatch.setattr(module.oauth_flow, "ensure_fresh_token", refresh)
    monkeypatch.setattr(manager, "_call_tool_blocking", lambda *_: pytest.fail("must not call"))
    with pytest.raises(ConflictError, match="changed before dispatch"):
        await manager.call_structured_tool("synthetic-broker", "inspect", {"id": "sample"})


async def test_schema_and_failed_connection_refuse_before_transport(harness, monkeypatch):
    manager, server = harness
    monkeypatch.setattr(manager, "_call_tool_blocking", lambda *_: pytest.fail("must not call"))
    with pytest.raises(ConflictError, match="schema does not match"):
        await manager.call_structured_tool("synthetic-broker", "inspect", {"id": 1})
    server.last_status = "auth_error"
    with pytest.raises(ConflictError, match="available connection"):
        await manager.call_structured_tool("synthetic-broker", "inspect", {"id": "sample"})


@pytest.mark.parametrize(
    "raw,images",
    [
        ("not json", []),
        ("NaN", []),
        ('{"error":"private detail"}', []),
        ("{}", [{}]),
        ("x" * 2_000_001, []),
    ],
)
async def test_bad_receipts_are_rejected_without_echoing_contents(
    harness, monkeypatch, raw, images
):
    manager, _ = harness
    monkeypatch.setattr(manager, "_call_tool_blocking", lambda *_: (raw, images))
    with pytest.raises(ConflictError) as error:
        await manager.call_structured_tool("synthetic-broker", "inspect", {"id": "sample"})
    assert "private detail" not in str(error.value)
