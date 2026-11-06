"""Synthetic work records preserve evidence without crossing participant boundaries."""

import asyncio

import pytest

from backend.core.errors import ConflictError, ValidationError
from backend.core.trading_runtime import bind_trading_context
from backend.services.trading import delegation
from backend.services.trading.work_records import (
    get_work_record,
    record_work,
    safe_work_payload,
    workspace_files,
    write_workspace_file,
)
from backend.services.trading_access import issue_access, revoke_access, token_digest


def make_run():
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
    return result["run"]["id"]


def test_file_versions_search_and_scope_are_isolated(db_isolated):
    run, other = make_run(), make_run()
    first = write_workspace_file(run, "research/notes.md", "First observation")
    assert write_workspace_file(run, "research/notes.md", "First observation")["id"] == first["id"]
    write_workspace_file(run, "research/notes.md", "Revised observation")
    assert (
        workspace_files(run, name="research/notes.md", version=1)["content"] == "First observation"
    )
    assert workspace_files(run)["items"][0]["version"] == 2
    with pytest.raises(ValidationError, match="relative"):
        write_workspace_file(run, "../outside", "No")
    with bind_trading_context(run, "external"), pytest.raises(ConflictError, match="another run"):
        workspace_files(other)


def test_large_records_are_reassembled_and_sensitive_values_redacted(db_isolated):
    run = make_run()
    sensitive = record_work(
        run, "tool_result", {"result": '{"api_key":"fictional-private-value","answer":42}'}
    )
    assert sensitive["payload"]["redacted"] is True
    assert "fictional-private-value" not in str(sensitive)
    assert '"answer": 42' in sensitive["payload"]["result"]
    payload = {"result": [f"Synthetic observation {index}" for index in range(20000)]}
    record = record_work(run, "tool_result", payload, source="host_observed")
    assert record["payload"]["availability"] == "chunked"
    assert get_work_record(run, record["id"])["payload"]["result"] == payload["result"]
    with pytest.raises(ValidationError, match="object"):
        record_work(run, "output", "not an object")


def test_work_record_read_rechecks_bound_grant(db_isolated):
    run, other = make_run(), make_run()
    record = record_work(run, "output", {"text": "Synthetic output"})
    issued = issue_access(run)
    with bind_trading_context(run, "external", token_digest(issued["token"])):
        assert get_work_record(run, record["id"])["id"] == record["id"]
        with pytest.raises(ConflictError, match="another run"):
            get_work_record(other, record["id"])
        revoke_access(run)
        with pytest.raises(ConflictError, match="revoked"):
            get_work_record(run, record["id"])


def test_redaction_preserves_financial_numbers_and_executable_code():
    source = 'limit_price = 75.00\naccount_id = "synthetic"\nprint(limit_price)\n'
    assert safe_work_payload(source) == source
    payload = safe_work_payload({"api_key": "fictional-private-value", "amount": "75.00"})
    assert payload["amount"] == "75.00"
    assert "fictional-private-value" not in str(payload)
    assert safe_work_payload({"input_tokens": 123})["input_tokens"] == 123
