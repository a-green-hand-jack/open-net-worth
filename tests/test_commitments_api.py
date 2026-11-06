"""
API tests for the commitments router (RFC Phase 1.2).

Offline + isolated: a minimal FastAPI app mounts only the commitments router.
CommitmentsStore is DB-backed (plan 4a task 3) — db_isolated gives each test its own
fresh, migrated database, so requests never touch live data. No LLM, no network, no
full-app lifespan.

Run:
    .venv/bin/pytest tests/test_commitments_api.py -v
"""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.api.commitments_api import router


def _seed_ledger_txns(*txn_ids):
    """Installments may only link a transaction that is really in the ledger (2026-10-13)."""
    from backend.db.transaction_store import TransactionStore

    for txn_id in txn_ids:
        TransactionStore().insert(
            {
                "id": txn_id,
                "date": "2026-06-01",
                "kind": "expense",
                "description": f"payment {txn_id}",
                "source": "manual",
            }
        )


def test_generated_action_label_source_round_trips_and_is_cleared_on_rename(client):
    created = client.post("/api/commitments", json={"name": "Synthetic", "kind": "purchase"})
    assert created.status_code in (200, 201)
    cid = created.json()["commitment"]["id"]
    source = {"kind": "draw_down", "label": "Custom lender"}
    actions = [
        {"id": "a1", "label": "Draw down Custom lender", "label_source": source},
        {"id": "a2", "label": "Draw down Custom lender"},
        {"id": "a3", "label": "User text", "label_source": source},
    ]
    saved = client.put(f"/api/commitments/{cid}/actions", json={"actions": actions})
    assert saved.status_code == 200
    rows = next(c for c in client.get("/api/commitments").json() if c["id"] == cid)["actions"]
    assert rows[0]["label_source"] == source
    assert "label_source" not in rows[1] and "label_source" not in rows[2]
    assert (
        client.patch(
            f"/api/commitments/{cid}/actions/a1", json={"changes": {"status": "done"}}
        ).json()["commitment"]["actions"][0]["label_source"]
        == source
    )
    renamed = client.patch(
        f"/api/commitments/{cid}/actions/a1", json={"changes": {"label": "My label"}}
    )
    assert renamed.status_code == 200
    assert "label_source" not in renamed.json()["commitment"]["actions"][0]


@pytest.fixture
def client(db_isolated):
    _seed_ledger_txns("txn-1")
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


def test_full_lifecycle(client):
    # empty to start
    assert client.get("/api/commitments").json() == []

    # create
    r = client.post(
        "/api/commitments",
        json={
            "name": "Maple Court",
            "currency": "vnd",
            "installments": [
                {"label": "Booking", "due_date": "2026-02-07", "amount": 100, "status": "paid"},
                {"label": "1st", "due_date": "2026-02-10", "amount": 861},
            ],
            "funding_plan": [
                {
                    "type": "asset_sale",
                    "label": "ONWAI",
                    "ref_position_id": "p1",
                    "sell_quantity": 1200,
                    "available_date": "2026-08-15",
                },
            ],
        },
    )
    assert r.status_code == 200
    c = r.json()["commitment"]
    cid = c["id"]
    assert cid == "maple-court" and c["currency"] == "VND"
    assert c["funding_plan"][0]["amount"] is None  # no amount typed → not planned yet

    # list + get
    assert len(client.get("/api/commitments").json()) == 1
    assert client.get(f"/api/commitments/{cid}").json()["name"] == "Maple Court"

    # top-level PUT (whitelisted)
    r = client.put(
        f"/api/commitments/{cid}", json={"changes": {"status": "completed", "name": "Apt"}}
    )
    assert r.json()["commitment"]["status"] == "completed"
    assert r.json()["commitment"]["name"] == "Apt"

    # per-row installment PATCH (only one row changes)
    inst_id = c["installments"][1]["id"]
    r = client.patch(
        f"/api/commitments/{cid}/installments/{inst_id}",
        json={"changes": {"status": "paid", "paid_txn_id": "txn-1", "amount": 870}},
    )
    rows = {i["id"]: i for i in r.json()["commitment"]["installments"]}
    assert rows[inst_id]["status"] == "paid" and rows[inst_id]["paid_txn_id"] == "txn-1"
    assert rows[inst_id]["amount"] == 870
    # the other row untouched
    other = c["installments"][0]["id"]
    assert rows[other]["label"] == "Booking"

    # replace installments + funding
    r = client.put(
        f"/api/commitments/{cid}/installments",
        json={"installments": [{"label": "only", "amount": 5}]},
    )
    assert len(r.json()["commitment"]["installments"]) == 1
    r = client.put(
        f"/api/commitments/{cid}/funding",
        json={"funding_plan": [{"type": "loan", "label": "Meridian Bank", "amount": 200000}]},
    )
    assert r.json()["commitment"]["funding_plan"][0]["type"] == "loan"

    # delete
    assert client.delete(f"/api/commitments/{cid}").json() == {"ok": True}
    assert client.get("/api/commitments").json() == []


def test_404s(client):
    assert client.get("/api/commitments/ghost").status_code == 404
    assert client.put("/api/commitments/ghost", json={"changes": {"name": "x"}}).status_code == 404
    assert client.delete("/api/commitments/ghost").status_code == 404
    assert (
        client.put("/api/commitments/ghost/installments", json={"installments": []}).status_code
        == 404
    )
    assert (
        client.put("/api/commitments/ghost/funding", json={"funding_plan": []}).status_code == 404
    )


def test_patch_missing_installment_404(client):
    cid = client.post("/api/commitments", json={"name": "Apt"}).json()["commitment"]["id"]
    r = client.patch(
        f"/api/commitments/{cid}/installments/no-such", json={"changes": {"amount": 1}}
    )
    assert r.status_code == 404


def test_list_attaches_assessed_in_coverage(client, monkeypatch):
    # Regression: the per-commitment coverage attachment must include `assessed` so the
    # UI can distinguish "engine says covered" from "engine never evaluated (tracker)".
    cid = client.post("/api/commitments", json={"name": "Apt", "kind": "purchase"}).json()[
        "commitment"
    ]["id"]
    from backend.services import commitments as commitments_service

    monkeypatch.setattr(
        commitments_service,
        "coverage",
        lambda: {
            "commitments": [
                {
                    "id": cid,
                    "assessed": True,
                    "at_risk": False,
                    "shortfall_base": 0.0,
                    "earliest_shortfall_date": None,
                }
            ]
        },
    )
    rows = client.get("/api/commitments").json()
    assert rows[0]["coverage"] == {
        "assessed": True,
        "at_risk": False,
        "shortfall_base": 0.0,
        "earliest_shortfall_date": None,
    }


def test_unmarked_payments_endpoint_not_shadowed(client, monkeypatch):
    # The static route must win over GET /api/commitments/{commitment_id} — a
    # shadowed route would 404 ("commitment 'unmarked-payments' not found").
    from backend.services import commitments as commitments_service

    monkeypatch.setattr(
        commitments_service, "detect_unmarked_payments", lambda: [{"commitment_id": "c1"}]
    )
    r = client.get("/api/commitments/unmarked-payments")
    assert r.status_code == 200
    assert r.json() == [{"commitment_id": "c1"}]


def test_list_filters(client):
    client.post("/api/commitments", json={"name": "Apt", "kind": "purchase"})
    client.post("/api/commitments", json={"name": "Meridian Bank", "kind": "loan_repayment"})
    assert len(client.get("/api/commitments", params={"kind": "purchase"}).json()) == 1
    assert len(client.get("/api/commitments", params={"status": "active"}).json()) == 2


# ── funding execution state over REST (2026-08-23) ────────────────────────────


def _commitment_with_funding(client):
    r = client.post(
        "/api/commitments",
        json={
            "name": "Apt",
            "funding_plan": [{"id": "fs-1", "type": "income", "amount": 3000, "currency": "SGD"}],
        },
    )
    assert r.status_code in (200, 201), r.text
    return r.json()["id"] if "id" in r.json() else r.json()["commitment"]["id"]


def test_patch_funding_source_marks_it_done(client):
    cid = _commitment_with_funding(client)
    r = client.patch(
        f"/api/commitments/{cid}/funding/fs-1",
        json={"changes": {"status": "done", "realized_txn_id": "txn-1"}},
    )
    assert r.status_code == 200, r.text
    source = r.json()["commitment"]["funding_plan"][0]
    assert source["status"] == "done"
    assert source["realized_txn_id"] == "txn-1"


def test_patch_funding_source_refuses_an_unknown_status(client):
    cid = _commitment_with_funding(client)
    r = client.patch(f"/api/commitments/{cid}/funding/fs-1", json={"changes": {"status": "banana"}})
    assert r.status_code == 422, r.text


def test_reschedule_description_source_preserves_user_text_and_clears_on_edit(client):
    created = client.post(
        "/api/commitments",
        json={
            "name": "Synthetic",
            "kind": "purchase",
            "installments": [
                {
                    "id": "i1",
                    "label": "First",
                    "description": "Custom note",
                    "due_date": "2026-04-01",
                    "amount": 25,
                }
            ],
        },
    )
    cid = created.json()["commitment"]["id"]
    source = {
        "original": "Custom note",
        "moves": [{"date": "2026-04-01", "rendered": "1 Apr 2026"}],
    }
    description = "Custom note · moved from 1 Apr 2026"
    response = client.patch(
        f"/api/commitments/{cid}/installments/i1",
        json={
            "changes": {
                "description": description,
                "description_source": source,
                "due_date": "2026-05-01",
            }
        },
    )
    assert response.status_code == 200
    assert response.json()["commitment"]["installments"][0]["description_source"] == source
    stored = client.get(f"/api/commitments/{cid}").json()["installments"][0]
    assert stored["description"] == description and stored["description_source"] == source
    renamed = client.patch(
        f"/api/commitments/{cid}/installments/i1", json={"changes": {"description": "My edit"}}
    )
    assert renamed.status_code == 200
    assert "description_source" not in renamed.json()["commitment"]["installments"][0]
    invalid = client.patch(
        f"/api/commitments/{cid}/installments/i1", json={"changes": {"description_source": source}}
    )
    assert "description_source" not in invalid.json()["commitment"]["installments"][0]
