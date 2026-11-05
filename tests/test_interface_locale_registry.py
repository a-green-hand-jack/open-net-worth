"""Profile validation uses the same locale registry as browser resolution."""

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from backend.api.profile import ProfileBody


def test_profile_accepts_every_registered_locale_and_rejects_unknown():
    registry = json.loads(Path("backend/core/interface_locales.json").read_text(encoding="utf-8"))
    assert ProfileBody(language=None).language is None
    for entry in registry:
        assert ProfileBody(language=entry["id"]).language == entry["id"]
    with pytest.raises(ValidationError):
        ProfileBody(language="not-a-registered-locale")
