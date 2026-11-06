"""Build the first-party approval enum allowlist from registered tool schemas.

Usage: python3 -m backend.scripts.sync_tool_schema_enums [--check]
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import backend.ai.tools  # noqa: F401 — populate the first-party registry
from backend.ai.tools.schema_enums import schema_version, snapshot_content

OUTPUT = (
    Path(__file__).resolve().parents[2]
    / "frontend/src/components/chat/approval/toolSchemaEnums.json"
)
VERSION = OUTPUT.with_name("toolSchemaEnums.version.json")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    content = snapshot_content()
    version = json.dumps({"sha256": schema_version()}, indent=2) + "\n"
    if args.check:
        if (
            not OUTPUT.exists()
            or OUTPUT.read_text() != content
            or not VERSION.exists()
            or VERSION.read_text() != version
        ):
            raise SystemExit(
                "tool schema enum allowlist is stale; run python3 -m backend.scripts.sync_tool_schema_enums"
            )
    else:
        OUTPUT.write_text(content)
        VERSION.write_text(version)


if __name__ == "__main__":
    main()
