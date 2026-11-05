"""Profile validation uses the same locale registry as browser resolution."""

import json
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from backend.api.profile import ProfileBody, router


def test_profile_accepts_every_registered_locale_and_rejects_unknown():
    registry = json.loads(Path("backend/core/interface_locales.json").read_text(encoding="utf-8"))
    assert ProfileBody(language=None).language is None
    for entry in registry:
        assert ProfileBody(language=entry["id"]).language == entry["id"]
    with pytest.raises(ValidationError):
        ProfileBody(language="not-a-registered-locale")


def test_profile_language_persists_and_explicit_null_clears(db_isolated):
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    assert client.get("/api/profile").json()["language"] is None
    assert client.put("/api/profile", json={"language": "zh-CN"}).status_code == 200
    assert client.get("/api/profile").json()["language"] == "zh-CN"
    assert client.put("/api/profile", json={"name": "Synthetic"}).status_code == 200
    assert client.get("/api/profile").json()["language"] == "zh-CN"
    assert client.put("/api/profile", json={"language": "invalid"}).status_code == 422
    assert client.get("/api/profile").json()["language"] == "zh-CN"
    assert client.put("/api/profile", json={"language": None}).status_code == 200
    assert client.get("/api/profile").json()["language"] is None
