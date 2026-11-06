"""Scoped workspace tools run through the actual participant gateway."""

import asyncio
import json
from datetime import datetime, timedelta, timezone

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


@pytest.mark.parametrize(
    ("name", "arguments"),
    [
        ("search_trading_research", {"query": "synthetic research"}),
        ("fetch_trading_research", {"url": "https://example.com/research"}),
        ("request_trading_market_data", {"instruments": [{"symbol": "ACME"}]}),
    ],
)
def test_backtest_gateway_refuses_current_research_and_quotes(setup_run, name, arguments):
    from backend.main import app

    tool_permissions.set_tool_permission("core", name, "always_allow")
    token = issue_access(setup_run)["token"]
    response = rpc(TestClient(app), setup_run, token, name, arguments)
    assert response.status_code == 200
    result = response.json()["result"]
    assert result["isError"] is True
    assert "historical" in result["content"][0]["text"].lower()


def test_paper_gateway_subscribes_with_verified_synthetic_quote(db_isolated, monkeypatch):
    from backend.main import app
    from backend.services.trading import price_feed

    now = datetime.now(timezone.utc)
    result = asyncio.run(
        delegation.create_delegation(
            {
                "workspace": {"name": "Synthetic", "mandate": {"market_data_source": "yahoo"}},
                "environment": {
                    "mode": "paper",
                    "start_at": (now - timedelta(minutes=1)).isoformat(),
                    "end_at": (now + timedelta(days=1)).isoformat(),
                    "accounts": [{"capital": "1000"}],
                },
            }
        )
    )
    monkeypatch.setattr(
        price_feed.prices,
        "fetch_yahoo_quotes",
        lambda symbols: {
            "prices": {symbol: 75 for symbol in symbols},
            "as_of": {symbol: now.isoformat() for symbol in symbols},
            "currencies": {symbol: "USD" for symbol in symbols},
            "timestamp_verified": {symbol: True for symbol in symbols},
        },
    )
    monkeypatch.setattr(price_feed.prices, "fetch_history_result", lambda *_: {"points": []})
    name = "request_trading_market_data"
    tool_permissions.set_tool_permission("core", name, "always_allow")
    run = result["run"]["id"]
    response = rpc(
        TestClient(app),
        run,
        issue_access(run)["token"],
        name,
        {"instruments": [{"symbol": "ACME"}]},
    )
    output = unpack(response)
    assert output["subscribed"] == 1
    assert output["refresh"]["received"] == 1
    assert output["market_data"]["items"][-1]["price"] == "75"


class _RevokedResearchDispatched(AssertionError):
    pass


@pytest.mark.xfail(
    strict=True,
    raises=_RevokedResearchDispatched,
    reason="Research can dispatch after participant grant revocation (PR #28)",
)
@pytest.mark.parametrize(
    ("name", "arguments", "handler"),
    [
        ("search_trading_research", {"query": "synthetic"}, "web_search"),
        ("fetch_trading_research", {"url": "https://example.com/"}, "fetch_page"),
    ],
)
def test_gateway_revocation_before_research_prevents_external_request(
    db_isolated, monkeypatch, name, arguments, handler
):
    from backend.ai.tools import misc
    from backend.main import app
    from backend.mcp import trading_gateway

    now = datetime.now(timezone.utc)
    run = asyncio.run(
        delegation.create_delegation(
            {
                "workspace": {"name": "Synthetic"},
                "environment": {
                    "mode": "paper",
                    "start_at": (now - timedelta(minutes=1)).isoformat(),
                    "end_at": (now + timedelta(days=1)).isoformat(),
                    "accounts": [{"capital": "1000"}],
                },
            }
        )
    )["run"]["id"]
    token = issue_access(run)["token"]
    tool_permissions.set_tool_permission("core", name, "always_allow")
    observed = []

    async def fake_external(data):
        observed.append(data)
        return "{}", None

    monkeypatch.setattr(misc, handler, fake_external)
    real_record = trading_gateway.record_work

    def revoke_after_record(*args, **kwargs):
        result = real_record(*args, **kwargs)
        revoke_access(run)
        return result

    monkeypatch.setattr(trading_gateway, "record_work", revoke_after_record)
    response = rpc(TestClient(app), run, token, name, arguments)
    assert response.json()["result"]["isError"] is True
    if observed:
        raise _RevokedResearchDispatched("Research handler invoked after grant revocation")


@pytest.mark.parametrize(
    ("name", "arguments", "handler"),
    [
        ("search_trading_research", {"query": "synthetic"}, "web_search"),
        ("fetch_trading_research", {"url": "https://example.com/"}, "fetch_page"),
    ],
)
def test_gateway_valid_grant_allows_paper_research(
    db_isolated, monkeypatch, name, arguments, handler
):
    from backend.ai.tools import misc
    from backend.main import app

    now = datetime.now(timezone.utc)
    run = asyncio.run(
        delegation.create_delegation(
            {
                "workspace": {"name": "Synthetic"},
                "environment": {
                    "mode": "paper",
                    "start_at": (now - timedelta(minutes=1)).isoformat(),
                    "end_at": (now + timedelta(days=1)).isoformat(),
                    "accounts": [{"capital": "1000"}],
                },
            }
        )
    )["run"]["id"]
    observed = []

    async def fake_external(data):
        observed.append(data)
        return '{"result":"synthetic"}', None

    monkeypatch.setattr(misc, handler, fake_external)
    tool_permissions.set_tool_permission("core", name, "always_allow")
    response = rpc(TestClient(app), run, issue_access(run)["token"], name, arguments)
    assert unpack(response) == {"result": "synthetic"}
    assert observed == [arguments]
