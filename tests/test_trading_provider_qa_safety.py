"""Safety checks for opt-in synthetic trading provider acceptance."""

import os
import subprocess
import sys
from pathlib import Path

import pytest

from tests.cli_live.conftest import _project_login_home


@pytest.fixture
def project(tmp_path):
    subprocess.run(["git", "init", "--quiet", str(tmp_path)], check=True, timeout=10)
    (tmp_path / ".gitignore").write_text("scratch/\n")
    return tmp_path


def test_project_login_home_accepts_ignored_local_directory(project):
    home = project / "scratch" / "codex"
    home.mkdir(parents=True)
    assert _project_login_home(project, str(home)) == home.resolve()


def test_project_login_home_rejects_external_and_unignored_directories(project, tmp_path):
    unignored = project / "visible"
    unignored.mkdir()
    external = tmp_path.parent
    with pytest.raises(ValueError, match="gitignored"):
        _project_login_home(project, str(unignored))
    with pytest.raises(ValueError, match="inside this project"):
        _project_login_home(project, str(external))


def test_project_login_home_rejects_directory_link_outside_project(project, tmp_path):
    scratch = project / "scratch"
    scratch.mkdir()
    (scratch / "external").symlink_to(tmp_path.parent, target_is_directory=True)
    with pytest.raises(ValueError, match="inside this project"):
        _project_login_home(project, str(scratch / "external"))


def test_project_login_home_rejects_linked_auth(project, tmp_path):
    home = project / "scratch" / "codex"
    home.mkdir(parents=True)
    (home / "auth.json").symlink_to(tmp_path.parent / "not-a-login")
    with pytest.raises(ValueError, match="linked auth"):
        _project_login_home(project, str(home))


def test_external_provider_fixture_requires_synthetic_opt_in():
    script = (
        Path(__file__).resolve().parents[1]
        / "qa/browser-use/fixtures/verify_trading_external_provider.py"
    )
    result = subprocess.run(
        [sys.executable, str(script)],
        env={"PATH": os.environ.get("PATH", "")},
        capture_output=True,
        text=True,
        timeout=10,
    )
    assert result.returncode != 0
    assert "disposable synthetic book is required" in result.stderr


def test_external_provider_fixture_requires_separate_provider_opt_in():
    script = (
        Path(__file__).resolve().parents[1]
        / "qa/browser-use/fixtures/verify_trading_external_provider.py"
    )
    result = subprocess.run(
        [sys.executable, str(script)],
        env={"PATH": os.environ.get("PATH", ""), "ONW_TRADING_SYNTHETIC_QA": "1"},
        capture_output=True,
        text=True,
        timeout=10,
    )
    assert result.returncode != 0
    assert "requires explicit opt-in" in result.stderr
