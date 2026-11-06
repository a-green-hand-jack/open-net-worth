"""Opt-in live suite: real ``claude`` / ``codex`` binaries, the owner's own logins, real turns.

Skipped unless ``ONW_CLI_LIVE=1`` — ``make check`` and a bare ``pytest`` never spend a
subscription or need a login. Run it with ``make cli-smoke`` (see ``docs/ai/CLI_REGRESSION.md``).
Data isolation is the root ``tests/conftest.py``: every path is a throwaway directory, so the
isolated ``CODEX_HOME`` is built fresh and nothing here can touch the owner's book.
"""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

import pytest

SNAPSHOT_DIR = Path(__file__).parent / "snapshots"
LIVE = os.environ.get("ONW_CLI_LIVE") == "1"
UPDATE = os.environ.get("ONW_CLI_SNAPSHOT_UPDATE") == "1"


def pytest_collection_modifyitems(config, items):
    if LIVE:
        return
    skip = pytest.mark.skip(reason="live CLI suite — set ONW_CLI_LIVE=1 (make cli-smoke)")
    for item in items:
        if "cli_live" in item.nodeid:
            item.add_marker(skip)


def binary_or_skip(name: str) -> str:
    path = shutil.which(name)
    if not path:
        pytest.skip(f"{name} is not installed")
    return path


def models_for(provider_key: str) -> list[str]:
    """The ≤2 models for one CLI — evaluated at collection, so only when the suite is live."""
    if not LIVE:
        return ["-"]
    from backend.ai.models.cli_default_model import cli_default_model
    from tests.cli_live.matrix import pick_models

    if provider_key == "codex_cli":
        from backend.ai.models.codex_cli_catalog import model_ids

        listed = model_ids()
    else:
        from backend.api.models import _CLAUDE_CLI_MODELS

        # Newest pinned id wins a version tie: the list is appended oldest-first.
        listed = [m for m in reversed(_CLAUDE_CLI_MODELS) if m.startswith("claude-")]
    return pick_models(cli_default_model(provider_key), listed)


def check_snapshot(name: str, observed: dict, differ) -> list[str]:
    """Write ``snapshots/<name>.json`` when updating, else diff ``observed`` against it.

    ``differ(baseline, observed)`` returns a ``SnapshotDiff``; its notes are surfaced as a
    warning and its failures fail the test. Returns the notes.
    """
    import warnings

    from backend.ai.cli_regression import load_snapshot, write_snapshot

    path = SNAPSHOT_DIR / f"{name}.json"
    if UPDATE:
        write_snapshot(path, observed)
        return []
    baseline = load_snapshot(path)
    assert baseline is not None, (
        f"no snapshot at {path} — review the CLI, then make cli-smoke-update"
    )
    diff = differ(baseline, observed)
    assert diff.ok, (
        f"{name}: a default changed in a way that can break or leak tool use:\n  "
        + "\n  ".join(diff.failures)
        + "\nreview it, then `make cli-smoke-update` if it is acceptable"
    )
    if diff.notes:
        warnings.warn(f"{name} snapshot drift:\n  " + "\n  ".join(diff.notes), stacklevel=2)
    return diff.notes


def _project_login_home(root: Path, raw: str) -> Path:
    """Require an existing, ignored, project-local login directory; never inspect credentials."""
    path = Path(raw).expanduser()
    if not path.is_absolute():
        raise ValueError("Select an absolute project-owned login directory")
    root = root.resolve()
    path = path.resolve()
    if path == root or not path.is_relative_to(root) or not path.is_dir():
        raise ValueError("Login directory must be inside this project")
    if (path / "auth.json").is_symlink():
        raise ValueError("Project login must not use a linked auth file")
    ignored = subprocess.run(
        ["git", "-C", str(root), "check-ignore", "--quiet", "--", str(path.relative_to(root))],
        timeout=5,
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    if ignored.returncode != 0:
        raise ValueError("Project login directory must be gitignored")
    return path


@pytest.fixture
def project_cli_cache(monkeypatch):
    from backend.ai.models import codex_home

    root = Path(__file__).resolve().parents[2]
    selected = {}
    for key in ("CODEX_HOME", "CLAUDE_CONFIG_DIR"):
        raw = os.environ.get(key)
        if raw:
            selected[key] = _project_login_home(root, raw)
    if "CODEX_HOME" in selected:
        cache = selected["CODEX_HOME"] / "onw-managed-cli"
        cache.mkdir(mode=0o700, parents=True, exist_ok=True)
        monkeypatch.setattr(codex_home, "_HOME_DIR", cache)


@pytest.fixture
async def codex_frames(monkeypatch):
    """Record every frame the Codex app-server sends us, and stop its child afterwards.

    The persistent client is per event loop; without the teardown each test would leave its
    own ``codex app-server`` running.
    """
    from backend.ai.models import codex_app_server as cas

    frames: list[dict] = []
    dispatch, resolve = cas.AppServerClient._dispatch, cas.AppServerClient._resolve

    def tap_dispatch(self, msg):
        frames.append(msg)
        return dispatch(self, msg)

    def tap_resolve(self, msg):
        frames.append(msg)
        return resolve(self, msg)

    monkeypatch.setattr(cas.AppServerClient, "_dispatch", tap_dispatch)
    monkeypatch.setattr(cas.AppServerClient, "_resolve", tap_resolve)
    yield frames
    for client in list(cas._clients.values()):
        await client.aclose()
    cas._clients.clear()
