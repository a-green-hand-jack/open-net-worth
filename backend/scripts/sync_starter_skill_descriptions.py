"""Snapshot built-in skill display text for translation; pass --check to detect drift."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from backend.db.skill_store import STARTER_SKILLS

OUTPUT = (
    Path(__file__).resolve().parents[2]
    / "frontend/src/components/skills/starterSkills.registry.json"
)


def snapshot() -> str:
    rows = {}
    for starter in STARTER_SKILLS:
        rows[starter["id"]] = {
            field: {
                "english": str(starter.get(field, "")),
                "sha256": hashlib.sha256(str(starter.get(field, "")).encode("utf-8")).hexdigest(),
            }
            for field in ("name", "description")
        }
    return json.dumps(rows, ensure_ascii=False, sort_keys=True, indent=2) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    content = snapshot()
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != content:
            raise SystemExit("Starter skill display text changed; update the translation registry.")
    else:
        OUTPUT.write_text(content, encoding="utf-8")


if __name__ == "__main__":
    main()
