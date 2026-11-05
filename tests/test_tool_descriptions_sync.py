"""The UI must not translate a stale tool-description snapshot."""

from backend.scripts.sync_tool_descriptions import OUTPUT, snapshot


def test_tool_description_snapshot_matches_registry():
    assert OUTPUT.read_text(encoding="utf-8") == snapshot()
