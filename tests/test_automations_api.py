"""TestClient smoke test for GET /api/automations/activity — the Lucius landing screen's
Activity panel endpoint.

Isolation: automations/automation runs are DB-backed (backend.db.automation_store,
backend.db.automation_run_store) — db_isolated gives both tables a fresh, isolated sqlite
file so no live data is touched; seed via the stores directly.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from backend.db.automation_run_store import AutomationRunStore
from backend.db.automation_store import AutomationStore
from backend.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_get_activity_200_shape_when_empty(client, db_isolated):
    resp = client.get("/api/automations/activity")
    assert resp.status_code == 200
    assert resp.json() == {"active": [], "scheduled": [], "failed": []}


def test_automation_errors_keep_detail_and_only_identify_known_sources(
    client, db_isolated, monkeypatch
):
    from backend.api import automations
    from backend.core.errors import ValidationError

    body = {"name": "", "instructions": "Run a task", "trigger": {"kind": "manual"}}
    response = client.post("/api/automations", json=body)
    assert response.status_code == 422
    assert response.json() == {
        "detail": "automation name is required",
        "message_id": "automation.error.nameRequired",
        "message_params": {},
    }

    def external_error(_change):
        raise ValidationError("Provider said no")

    monkeypatch.setattr(automations, "apply_automation_change", external_error)
    response = client.post("/api/automations", json={**body, "name": "Example"})
    assert response.status_code == 422
    assert response.json() == {"detail": "Provider said no"}


def test_trigger_error_keeps_its_identity_through_the_api(client, db_isolated):
    response = client.post(
        "/api/automations",
        json={
            "name": "Example",
            "instructions": "Run",
            "trigger": {"kind": "schedule", "type": "weekly", "time": "09:00", "day": "bad"},
        },
    )
    assert response.status_code == 422
    assert response.json() == {
        "detail": "weekly schedule day must be mon through sun",
        "message_id": "automation.error.weeklyDay",
        "message_params": {},
    }


def test_automation_error_contract_tracks_emitted_ids():
    import ast
    import json
    from pathlib import Path

    root = Path(__file__).resolve().parents[1]
    contract = json.loads((root / "backend/core/automation_error_contract.json").read_text())
    emitted = set()
    for name in ("service", "runs", "executors", "references", "schedules", "txn_conditions"):
        tree = ast.parse((root / f"backend/services/automations/{name}.py").read_text())
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            for keyword in node.keywords:
                if keyword.arg == "message_id" and isinstance(keyword.value, ast.Constant):
                    emitted.add(keyword.value.value)
            if (
                isinstance(node.func, ast.Name)
                and node.func.id == "TriggerValidationError"
                and len(node.args) > 1
                and isinstance(node.args[1], ast.Constant)
            ):
                emitted.add(node.args[1].value)
    assert emitted == set(contract)


def test_get_activity_returns_active_and_scheduled_rows(client, db_isolated):
    automations = AutomationStore()
    runs = AutomationRunStore()

    waiting_automation = automations.create({"name": "Needs Review"})
    waiting_run = runs.start(
        {"automation_id": waiting_automation["id"], "session_id": "session_needs_review"}
    )
    runs.transition(waiting_run["id"], {"running"}, "waiting", {})

    scheduled_automation = automations.create({"name": "Weekly Report"})
    future = (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat()
    automations.update_by_id(scheduled_automation["id"], {"next_run_at": future})

    resp = client.get("/api/automations/activity")
    assert resp.status_code == 200
    body = resp.json()

    assert len(body["active"]) == 1
    active_row = body["active"][0]
    assert active_row["automation_id"] == waiting_automation["id"]
    assert active_row["automation_name"] == "Needs Review"
    assert active_row["run_id"] == waiting_run["id"]
    assert active_row["session_id"] == "session_needs_review"
    assert active_row["status"] == "waiting"
    assert "started_at" in active_row

    assert len(body["scheduled"]) == 1
    scheduled_row = body["scheduled"][0]
    assert scheduled_row["automation_id"] == scheduled_automation["id"]
    assert scheduled_row["automation_name"] == "Weekly Report"
    assert scheduled_row["next_run_at"] == future


def test_template_sources_round_trip_and_clear_independently(client, db_isolated):
    body = {
        "name": "Daily briefing",
        "description": "A short, friendly update on yesterday's money and investments.",
        "instructions": "Send a briefing.",
        "trigger": {"kind": "manual"},
        "template_source": {
            "name": "daily-briefing",
            "description": "daily-briefing",
            "instructions": "daily-briefing",
        },
    }
    response = client.post("/api/automations", json=body)
    assert response.status_code == 201
    row = response.json()
    assert row["template_source"] == body["template_source"]
    saved = client.get("/api/automations").json()["automations"][0]
    assert saved["template_source"] == body["template_source"]
    edited = client.patch(f"/api/automations/{row['id']}", json={"name": "My briefing"})
    assert edited.status_code == 200
    assert edited.json()["template_source"] == {
        "description": "daily-briefing",
        "instructions": "daily-briefing",
    }
    edited = client.patch(f"/api/automations/{row['id']}", json={"description": "My text"})
    assert edited.json()["template_source"] == {"instructions": "daily-briefing"}
    edited = client.patch(f"/api/automations/{row['id']}", json={"instructions": "My instructions"})
    assert edited.json()["template_source"] == {}
    unmarked = client.post(
        "/api/automations", json={**body, "template_source": {"name": "unknown"}}
    )
    assert unmarked.status_code == 201 and unmarked.json()["template_source"] == {}


def test_template_key_contract_tracks_frontend_catalog():
    import json
    import re
    from pathlib import Path

    root = Path(__file__).resolve().parents[1]
    keys = set(json.loads((root / "backend/core/automation_template_keys.json").read_text()))
    catalog = (root / "frontend/src/components/tabs/automations/automationTemplates.ts").read_text()
    assert keys == set(re.findall(r"^\s*key:\s*'([^']+)'", catalog, re.MULTILINE))
