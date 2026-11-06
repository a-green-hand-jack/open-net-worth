"""Validate optional origins for bundled Automation template display text."""

from __future__ import annotations

import json
from pathlib import Path

_KEYS = frozenset(
    json.loads(
        Path(__file__).with_name("automation_template_keys.json").read_text(encoding="utf-8")
    )
)


def template_source(value: object) -> dict[str, str]:
    if not isinstance(value, dict) or set(value) - {"name", "description", "instructions"}:
        return {}
    if any(not isinstance(item, str) or item not in _KEYS for item in value.values()):
        return {}
    return dict(value)
