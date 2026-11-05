"""Snapshot the first-party permission descriptions for translation.

Run ``python3 -m backend.scripts.sync_tool_descriptions [--check]`` after changing a tool.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import backend.ai.tools  # noqa: F401 — populate the registry
from backend.ai.permission_api_v2 import _first_sentence
from backend.ai.tools._connector_gate import permission_catalog
from backend.ai.tools.registry import tool_description

OUTPUT = Path(__file__).resolve().parents[2] / "frontend/src/i18n/toolDescriptions.registry.json"


def snapshot() -> str:
    descriptions = {}
    for _, name, _ in permission_catalog():
        english = _first_sentence(tool_description(name) or "")
        if english:
            descriptions[name] = {
                "english": english,
                "sha256": hashlib.sha256(english.encode("utf-8")).hexdigest(),
            }
    return json.dumps(descriptions, ensure_ascii=False, sort_keys=True, indent=2) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    content = snapshot()
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != content:
            raise SystemExit("Tool descriptions changed; update the translation registry.")
    else:
        OUTPUT.write_text(content, encoding="utf-8")


if __name__ == "__main__":
    main()
