"""Review and activation enforce the same explicit trading mandate."""

import asyncio
from copy import deepcopy

import pytest

from backend.core.errors import ConflictError, ValidationError
from backend.db.trading_store import TradingStore
from backend.services.trading import delegation, lifecycle


def call(coro):
    return asyncio.run(coro)


def draft():
    return {
        "workspace": {"name": "Synthetic", "instructions": "Research ACME."},
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


def test_review_is_unsaved_and_creation_preserves_original_mandate(db_isolated):
    data = draft()
    review = delegation.review_delegation(data)
    assert review["ready"] is True
    assert TradingStore("workspaces").all() == TradingStore("accounts").all() == []
    result = call(delegation.create_delegation(data))
    assert result["started"] is True
    overview = delegation.workspace_overview(result["workspace"]["id"])
    assert overview["original_mandate"]["instructions"] == data["workspace"]["instructions"]
    assert overview["current_run"]["id"] == result["run"]["id"]


@pytest.mark.parametrize("accounts", [None, [{}]])
def test_review_never_invents_funding(db_isolated, accounts):
    data = draft()
    if accounts is None:
        del data["environment"]["accounts"]
    else:
        data["environment"]["accounts"] = accounts
    with pytest.raises(ValidationError):
        delegation.review_delegation(data)
    with pytest.raises(ValidationError):
        call(delegation.create_delegation(data))
    assert TradingStore("workspaces").all() == TradingStore("accounts").all() == []


def test_unready_script_stays_blocked_instead_of_starting(db_isolated):
    data = draft()
    data["workspace"]["agent_kind"] = "script"
    review = delegation.review_delegation(data)
    assert review["ready"] is False
    result = call(delegation.create_delegation(data))
    assert result["started"] is False
    assert result["activation_error"]["code"] == "review_incomplete"
    assert result["run"]["state"] == "ready"
    assert (
        delegation.workspace_overview(result["workspace"]["id"])["current_work"]["state"]
        == "blocked"
    )
    with pytest.raises(ConflictError, match="strategy code"):
        call(lifecycle.apply_run_action(result["run"]["id"], {"action": "start"}))


def test_invalid_fx_rolls_back_the_whole_workspace_creation(db_isolated):
    data = draft()
    data["environment"]["accounts"] = [{"capital": "1000", "currency": "EUR"}]
    with pytest.raises(ValidationError, match="FX"):
        call(delegation.create_delegation(data))
    assert TradingStore("workspaces").all() == []
    assert TradingStore("accounts").all() == []


def test_second_active_environment_is_refused(db_isolated):
    data = draft()
    result = call(delegation.create_delegation(data))
    with pytest.raises(ConflictError, match="unfinished"):
        call(
            delegation.activate_delegation(
                result["workspace"]["id"],
                {
                    "environment": data["environment"],
                    "expected_revision": 1,
                },
            )
        )
    assert len(TradingStore("runs").all()) == 1


def test_stale_or_unready_activation_does_not_start(db_isolated):
    data = draft()
    data["workspace"]["agent_kind"] = "script"
    workspace = delegation.create_workspace(data["workspace"])
    activation = {"environment": deepcopy(data["environment"]), "expected_revision": 2}
    with pytest.raises(ConflictError, match="latest revision"):
        call(delegation.activate_delegation(workspace["id"], activation))
    assert TradingStore("runs").all() == []
    activation["expected_revision"] = 1
    result = call(delegation.activate_delegation(workspace["id"], activation))
    assert result["started"] is False
    assert result["activation_error"]["code"] == "review_incomplete"


def test_amendment_requires_pause_and_preserves_original(db_isolated):
    result = call(delegation.create_delegation(draft()))
    workspace, run = result["workspace"], result["run"]
    amendment = {
        "instructions": "Preserve cash.",
        "reason": "Changed objective",
        "expected_revision": 1,
    }
    with pytest.raises(ConflictError, match="Pause"):
        delegation.amend_mandate(workspace["id"], amendment)
    call(lifecycle.apply_run_action(run["id"], {"action": "pause"}))
    updated = delegation.amend_mandate(workspace["id"], amendment)
    assert updated["workspace"]["original_mandate"]["instructions"] == "Research ACME."
    assert updated["current_run"]["mandate_revision"] == 2
    with pytest.raises(ConflictError, match="latest revision"):
        delegation.amend_mandate(workspace["id"], amendment)
