"""Human-only local coding-engine service for the Open Net Worth Builder workspace.

This module deliberately is *not* part of the Lucius tool registry.  It owns a fixed,
server-selected repository root and the narrow subprocess contracts for Codex and Claude
Code.  The API layer may call it; agents, skills, scheduled tasks and MCP clients may not.
"""

from __future__ import annotations

import asyncio
import json
import os
import shutil
import subprocess
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Awaitable, Callable, Literal

from backend.core.config import get_settings
from backend.core.process_tree import kill_tree, spawn_kwargs, terminate_tree
from backend.db.model_config_store import ModelConfigStore

EngineId = Literal["codex", "claude"]
BuilderMode = Literal["plan", "build"]

ENGINE_IDS: tuple[EngineId, ...] = ("codex", "claude")
MODES: tuple[BuilderMode, ...] = ("plan", "build")
MAX_EVENT_TEXT = 12_000
MAX_WORKSPACE_CHANGES = 100
MAX_EVENTS = 500
MAX_RUNS = 20
MAX_PROMPT_LENGTH = 12_000
RUNNING_STATUSES = frozenset({"queued", "running"})
DESKTOP_EXECUTION_REFUSAL = (
    "Builder coding engines are unavailable in the desktop app until "
    "child-process containment is supported."
)
DEMO_EXECUTION_REFUSAL = "Builder coding engines are disabled on the public demo."

_CHILD_ENV_ALLOWLIST = frozenset(
    {
        "COLORTERM",
        "FORCE_COLOR",
        "HOME",
        "LANG",
        "LOGNAME",
        "NODE_EXTRA_CA_CERTS",
        "NO_COLOR",
        "PATH",
        "REQUESTS_CA_BUNDLE",
        "SHELL",
        "SSL_CERT_DIR",
        "SSL_CERT_FILE",
        "TEMP",
        "TERM",
        "TERM_PROGRAM",
        "TERM_PROGRAM_VERSION",
        "TMP",
        "TMPDIR",
        "USER",
        "XDG_CONFIG_HOME",
        # Windows: the profile locations hold the engine's login, PATHEXT/COMSPEC resolve its
        # ``.cmd`` shim. ``os.environ`` upper-cases names there, so these are matched upper-cased.
        "APPDATA",
        "COMSPEC",
        "HOMEDRIVE",
        "HOMEPATH",
        "LOCALAPPDATA",
        "PATHEXT",
        "PROGRAMDATA",
        "PROGRAMFILES",
        "SYSTEMDRIVE",
        "SYSTEMROOT",
        "USERPROFILE",
        "WINDIR",
    }
)


def workspace_root() -> Path:
    """Return the server-controlled checkout Builder is allowed to operate on."""
    configured = (os.getenv("ONW_BUILDER_ROOT") or "").strip()
    if configured:
        return Path(configured).expanduser().resolve()
    return Path(__file__).resolve().parents[2]


def validate_workspace(root: Path | None = None) -> Path:
    """Resolve and validate the minimal Open Net Worth source-tree markers."""
    candidate = (root or workspace_root()).resolve()
    required = (candidate / "backend", candidate / "frontend", candidate / "package.json")
    if not candidate.is_dir() or not all(path.exists() for path in required):
        raise ValueError(
            "Builder workspace is not an Open Net Worth source checkout. "
            "Set ONW_BUILDER_ROOT to the folder containing backend/, frontend/, and package.json."
        )
    return candidate


def child_env() -> dict[str, str]:
    """Return the inherited non-secret environment for a local coding CLI.

    The engine keeps access to its own on-disk subscription login.  App data paths,
    provider key overrides, Open Net Worth secrets and telemetry destinations are not
    inherited by the child.
    """
    env = {
        key: value
        for key, value in os.environ.items()
        if (key.upper() if os.name == "nt" else key) in _CHILD_ENV_ALLOWLIST
        or key.startswith("LC_")
    }
    env["CI"] = "1"
    return env


def resolve_engine_command(engine: EngineId) -> str:
    """Use the matching AI-provider CLI path when configured, otherwise PATH."""
    if engine not in ENGINE_IDS:
        raise ValueError(f"Unknown Builder engine {engine!r}")
    provider_key = f"{engine}_cli"
    try:
        configured = ModelConfigStore().resolve_for_provider(provider_key)
        path = ((configured or {}).get("base_url") or "").strip()
        if path:
            return path
    except Exception:
        # Engine discovery must remain available even when model config is absent,
        # disabled, or temporarily unreadable.  PATH is the documented fallback.
        pass
    return engine


def _version(executable: str) -> str:
    try:
        result = subprocess.run(
            [executable, "--version"],
            capture_output=True,
            text=True,
            timeout=3,
            check=False,
            env=child_env(),
        )
    except (OSError, subprocess.SubprocessError):
        return ""
    return ((result.stdout or result.stderr or "").strip().splitlines() or [""])[0][:200]


def engine_statuses() -> list[dict[str, Any]]:
    """Discover the two supported local engines without starting a paid run."""
    rows: list[dict[str, Any]] = []
    definitions = {
        "codex": {
            "label": "Codex",
            "build_is_sandboxed": True,
            "guidance": "Install Codex, run `codex login`, then restart Open Net Worth.",
        },
        "claude": {
            "label": "Claude Code",
            "build_is_sandboxed": False,
            "guidance": "Install Claude Code, run `claude login`, then restart Open Net Worth.",
        },
    }
    refusal, refusal_id = _execution_refusal_info()
    for engine in ENGINE_IDS:
        configured = engine if refusal else resolve_engine_command(engine)
        resolved = None if refusal else shutil.which(configured)
        meta = definitions[engine]
        rows.append(
            {
                "id": engine,
                "label": meta["label"],
                "installed": bool(resolved),
                "version": _version(resolved) if resolved else "",
                "command": resolved or configured,
                "build_is_sandboxed": meta["build_is_sandboxed"],
                "guidance": refusal or meta["guidance"],
                "guidance_message": {
                    "id": refusal_id or f"builder.guidance.{engine}",
                    "params": {},
                },
            }
        )
    return rows


def build_argv(
    engine: EngineId,
    mode: BuilderMode,
    *,
    executable: str | None = None,
) -> list[str]:
    """Return the closed-world CLI arguments for one Builder run."""
    if engine not in ENGINE_IDS:
        raise ValueError(f"Unknown Builder engine {engine!r}")
    if mode not in MODES:
        raise ValueError(f"Unknown Builder mode {mode!r}")
    command = executable or resolve_engine_command(engine)

    if engine == "codex":
        sandbox = "read-only" if mode == "plan" else "workspace-write"
        return [
            command,
            "exec",
            "--json",
            "--color",
            "never",
            "--sandbox",
            sandbox,
            "--ephemeral",
            "-c",
            'approval_policy="never"',
            "-c",
            "mcp_servers={}",
            "-c",
            "tools.web_search=false",
            "-",
        ]

    permission_mode = "plan" if mode == "plan" else "acceptEdits"
    return [
        command,
        "-p",
        "--input-format",
        "text",
        "--output-format",
        "stream-json",
        "--verbose",
        "--permission-mode",
        permission_mode,
        "--tools",
        "default",
        "--strict-mcp-config",
        "--mcp-config",
        "{}",
        "--setting-sources",
        "project",
        "--no-session-persistence",
    ]


def build_prompt(mode: BuilderMode, request: str) -> str:
    """Wrap the user's outcome in Builder-specific scope and safety instructions."""
    if mode not in MODES:
        raise ValueError(f"Unknown Builder mode {mode!r}")
    if mode == "plan":
        authority = (
            "This is a read-only planning run. Inspect the repository and its project "
            "instructions. Do not modify files or run commands that change the workspace. "
            "Return a concrete implementation plan with affected files, risks, and verification."
        )
    else:
        authority = (
            "This is an implementation run. You may inspect and edit this Open Net Worth checkout to "
            "deliver the requested outcome. Follow the repository instructions and run relevant "
            "tests. Preserve unrelated user changes."
        )
    return (
        "You are the local coding engine behind Open Net Worth's human-operated Build workspace.\n\n"
        f"{authority}\n\n"
        "Do not commit, push, open a pull request, or deploy. Those actions require separate "
        "human authority outside this workspace.\n\n"
        "User request:\n"
        f"{request.strip()}"
    )


def _bounded_text(value: Any) -> str:
    text = str(value or "").strip()
    if len(text) <= MAX_EVENT_TEXT:
        return text
    return f"{text[:MAX_EVENT_TEXT]}\n… output truncated"


def _tool_summary(block: dict[str, Any]) -> str:
    name = _bounded_text(block.get("name") or "Tool")
    inputs = block.get("input") if isinstance(block.get("input"), dict) else {}
    detail = (
        inputs.get("file_path")
        or inputs.get("path")
        or inputs.get("command")
        or inputs.get("pattern")
        or ""
    )
    return f"{name} • {_bounded_text(detail)}" if detail else name


def normalize_event(engine: EngineId, payload: dict[str, Any]) -> list[tuple[str, str]]:
    """Map moving vendor JSONL schemas onto the small Builder activity vocabulary."""
    events: list[tuple[str, str]] = []
    event_type = payload.get("type") or payload.get("event") or ""

    if engine == "codex":
        item = payload.get("item") if isinstance(payload.get("item"), dict) else {}
        item_type = item.get("type") or ""
        if event_type in {"item.started", "item.completed", "item.updated"}:
            if item_type in {"agent_message", "message"}:
                text = _bounded_text(item.get("text") or item.get("content"))
                if text:
                    events.append(("assistant", text))
            elif item_type in {"command_execution", "command"}:
                command = _bounded_text(item.get("command"))
                output = _bounded_text(item.get("aggregated_output") or item.get("output"))
                if command:
                    events.append(("tool", command))
                if output:
                    events.append(("output", output))
            elif item_type in {"file_change", "file_edit"}:
                path = _bounded_text(item.get("path") or item.get("file_path") or "Files changed")
                events.append(("tool", path))
        elif event_type in {"error", "turn.failed"}:
            detail = payload.get("message") or payload.get("error") or "Codex run failed."
            if isinstance(detail, dict):
                detail = detail.get("message") or json.dumps(detail)
            events.append(("error", _bounded_text(detail)))
        return events

    if engine == "claude":
        if event_type == "assistant":
            message = payload.get("message") if isinstance(payload.get("message"), dict) else {}
            content = message.get("content") if isinstance(message.get("content"), list) else []
            for block in content:
                if not isinstance(block, dict):
                    continue
                if block.get("type") == "text":
                    text = _bounded_text(block.get("text"))
                    if text:
                        events.append(("assistant", text))
                elif block.get("type") == "tool_use":
                    events.append(("tool", _tool_summary(block)))
        elif event_type == "result":
            text = _bounded_text(payload.get("result") or payload.get("error"))
            if text:
                events.append(("error" if payload.get("is_error") else "assistant", text))
        return events

    raise ValueError(f"Unknown Builder engine {engine!r}")


def workspace_changes(root: Path | None = None) -> list[str]:
    """Return the checkout's current porcelain status, explicitly not attribution."""
    candidate = (root or workspace_root()).resolve()
    try:
        result = subprocess.run(
            ["git", "status", "--short"],
            cwd=candidate,
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
            env=child_env(),
        )
    except (OSError, subprocess.SubprocessError):
        return []
    if result.returncode != 0:
        return []
    return [line.strip() for line in result.stdout.splitlines() if line.strip()][
        :MAX_WORKSPACE_CHANGES
    ]


class BuilderError(RuntimeError):
    """Base class for expected Builder failures."""

    def __init__(self, message: str, message_id: str | None = None, **params: Any):
        super().__init__(message)
        self.message_id = message_id
        self.message_params = params


class BuilderValidationError(BuilderError):
    """The requested run or configured workspace is invalid."""


class EngineUnavailableError(BuilderError):
    """The selected local coding engine cannot be launched."""


class ActiveRunError(BuilderError):
    """The first-slice single-run ceiling is already occupied."""


class RunNotFoundError(BuilderError):
    """A process-local run id no longer exists."""


def _execution_refusal_info() -> tuple[str, str | None]:
    """Why no coding engine may run here, or "" when one may.

    A demo's visitors are strangers, and an engine is an agent with a shell on the host: the
    refusal lives in the service, not only in the route lockdown, so no caller can start one."""
    settings = get_settings()
    if settings.desktop_mode:
        return DESKTOP_EXECUTION_REFUSAL, "builder.error.desktop"
    if settings.demo_mode:
        return DEMO_EXECUTION_REFUSAL, "builder.error.demo"
    return "", None


def _execution_refusal() -> str:
    return _execution_refusal_info()[0]


def _require_external_execution() -> None:
    refusal, message_id = _execution_refusal_info()
    if refusal:
        raise EngineUnavailableError(refusal, message_id)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class _Run:
    id: str
    engine: EngineId
    mode: BuilderMode
    prompt: str
    status: str = "queued"
    events: list[dict[str, Any]] = field(default_factory=list)
    started_at: str | None = None
    finished_at: str | None = None
    error: str = ""
    error_message: dict[str, Any] | None = None
    workspace_changes: list[str] = field(default_factory=list)


Executor = Callable[
    [str, EngineId, BuilderMode, str, Callable[..., None]],
    Awaitable[tuple[int, str]],
]


class BuilderManager:
    """Bounded process-local run registry and subprocess owner."""

    def __init__(
        self,
        *,
        executor: Executor | None = None,
        workspace: Path | None = None,
        engine_probe: Callable[[], list[dict[str, Any]]] = engine_statuses,
    ):
        self._executor = executor
        self._workspace = (workspace or workspace_root()).resolve()
        self._engine_probe = engine_probe
        self._runs: dict[str, _Run] = {}
        self._tasks: dict[str, asyncio.Task[None]] = {}
        self._processes: dict[str, asyncio.subprocess.Process] = {}

    def _emit(self, run: _Run, kind: str, text: str, message: dict | None = None) -> None:
        bounded = _bounded_text(text)
        if not bounded:
            return
        next_seq = run.events[-1]["seq"] + 1 if run.events else 1
        event = {"seq": next_seq, "kind": kind, "text": bounded, "created_at": _now()}
        if message is not None:
            event["text_message"] = message
        run.events.append(event)
        if len(run.events) > MAX_EVENTS:
            run.events[:] = run.events[-MAX_EVENTS:]

    def _snapshot(self, run: _Run, *, after: int = 0) -> dict[str, Any]:
        return {
            "id": run.id,
            "engine": run.engine,
            "mode": run.mode,
            "prompt": run.prompt,
            "status": run.status,
            "events": [dict(event) for event in run.events if event["seq"] > after],
            "started_at": run.started_at,
            "finished_at": run.finished_at,
            "error": run.error,
            "error_message": run.error_message,
            "workspace_changes": list(run.workspace_changes),
        }

    def _active_run_id(self) -> str | None:
        for run in self._runs.values():
            if run.status in RUNNING_STATUSES:
                return run.id
        return None

    def status(self) -> dict[str, Any]:
        error = ""
        error_message = None
        try:
            valid_workspace = validate_workspace(self._workspace)
            workspace_valid = True
        except ValueError as exc:
            valid_workspace = self._workspace
            workspace_valid = False
            error = str(exc)
            error_message = {"id": "builder.error.workspace", "params": {}}
        refusal, refusal_id = _execution_refusal_info()
        if refusal:
            workspace_valid = False
            error = refusal
            error_message = {"id": refusal_id, "params": {}}
        return {
            "workspace": str(valid_workspace),
            "workspace_name": valid_workspace.name,
            "workspace_valid": workspace_valid,
            "error": error,
            "error_message": error_message,
            "engines": self._engine_probe(),
            "active_run_id": self._active_run_id(),
        }

    async def start(self, engine: str, mode: str, prompt: str) -> dict[str, Any]:
        _require_external_execution()
        try:
            validate_workspace(self._workspace)
        except ValueError as exc:
            raise BuilderValidationError(str(exc), "builder.error.workspace") from exc
        if engine not in ENGINE_IDS:
            raise BuilderValidationError(
                f"Unknown coding engine {engine!r}.", "builder.error.unknownEngine", engine=engine
            )
        if mode not in MODES:
            raise BuilderValidationError(
                f"Unknown Builder mode {mode!r}.", "builder.error.unknownMode", mode=mode
            )
        cleaned_prompt = (prompt or "").strip()
        if not cleaned_prompt:
            raise BuilderValidationError(
                "Describe the change you want Open Net Worth to make.",
                "builder.error.promptRequired",
            )
        if len(cleaned_prompt) > MAX_PROMPT_LENGTH:
            raise BuilderValidationError(
                f"Keep the request under {MAX_PROMPT_LENGTH:,} characters and attach detail in files.",
                "builder.error.promptLong",
                count=MAX_PROMPT_LENGTH,
            )
        active = self._active_run_id()
        if active:
            raise ActiveRunError(
                f"Builder run {active} is still active. Stop it before starting another.",
                "builder.error.active",
                run_id=active,
            )

        statuses = {row.get("id"): row for row in self._engine_probe()}
        selected = statuses.get(engine)
        if not selected or not selected.get("installed"):
            raise EngineUnavailableError(
                f"{('Codex' if engine == 'codex' else 'Claude Code')} is not installed or not on the configured PATH.",
                "builder.error.notInstalled",
                engine=engine,
            )

        run = _Run(
            id=f"build_{uuid.uuid4().hex[:12]}", engine=engine, mode=mode, prompt=cleaned_prompt
        )  # type: ignore[arg-type]
        self._emit(run, "status", "Run queued.", {"id": "builder.event.queued", "params": {}})
        self._runs[run.id] = run
        self._prune_runs()
        self._tasks[run.id] = asyncio.create_task(self._execute(run))
        return self._snapshot(run)

    def _prune_runs(self) -> None:
        if len(self._runs) <= MAX_RUNS:
            return
        terminal = [
            run_id for run_id, run in self._runs.items() if run.status not in RUNNING_STATUSES
        ]
        for run_id in terminal[: max(0, len(self._runs) - MAX_RUNS)]:
            self._runs.pop(run_id, None)
            self._tasks.pop(run_id, None)

    async def _execute(self, run: _Run) -> None:
        run.status = "running"
        run.started_at = _now()
        self._emit(
            run,
            "status",
            f"{('Codex' if run.engine == 'codex' else 'Claude Code')} started.",
            {"id": "builder.event.started", "params": {"engine": run.engine}},
        )
        executor = self._executor or self._execute_subprocess
        try:
            return_code, stderr = await executor(
                run.id,
                run.engine,
                run.mode,
                run.prompt,
                lambda kind, text, message=None: self._emit(run, kind, text, message),
            )
            if run.status == "cancelled":
                return
            if return_code == 0:
                run.status = "succeeded"
                self._emit(
                    run, "status", "Run finished.", {"id": "builder.event.finished", "params": {}}
                )
            else:
                run.status = "failed"
                run.error = (
                    _bounded_text(stderr) or f"Coding engine exited with status {return_code}."
                )
                if not _bounded_text(stderr):
                    run.error_message = {
                        "id": "builder.error.exitStatus",
                        "params": {"status": return_code},
                    }
                self._emit(run, "error", run.error, run.error_message)
        except asyncio.CancelledError:
            if run.status != "cancelled":
                run.status = "cancelled"
                self._emit(
                    run, "status", "Run stopped.", {"id": "builder.event.stopped", "params": {}}
                )
            raise
        except Exception as exc:
            if run.status != "cancelled":
                run.status = "failed"
                run.error = _bounded_text(exc) or "Coding engine failed."
                if isinstance(exc, BuilderError) and exc.message_id:
                    run.error_message = {"id": exc.message_id, "params": exc.message_params}
                elif not _bounded_text(exc):
                    run.error_message = {"id": "builder.error.engineFailed", "params": {}}
                self._emit(run, "error", run.error, run.error_message)
        finally:
            if run.status not in RUNNING_STATUSES:
                run.finished_at = run.finished_at or _now()
                run.workspace_changes = workspace_changes(self._workspace)
            self._processes.pop(run.id, None)

    async def _execute_subprocess(
        self,
        run_id: str,
        engine: EngineId,
        mode: BuilderMode,
        request: str,
        emit: Callable[..., None],
    ) -> tuple[int, str]:
        _require_external_execution()
        command = resolve_engine_command(engine)
        executable = shutil.which(command)
        if not executable:
            raise EngineUnavailableError(
                f"Coding engine executable {command!r} is no longer available.",
                "builder.error.executableMissing",
                command=command,
            )
        argv = build_argv(engine, mode, executable=executable)
        process = await asyncio.create_subprocess_exec(
            *argv,
            cwd=self._workspace,
            env=child_env(),
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            limit=8 * 1024 * 1024,
            **spawn_kwargs(),
        )
        self._processes[run_id] = process
        assert process.stdin is not None
        process.stdin.write(build_prompt(mode, request).encode("utf-8"))
        await process.stdin.drain()
        process.stdin.close()

        stderr_parts: list[str] = []

        async def read_stdout() -> None:
            assert process.stdout is not None
            while line := await process.stdout.readline():
                decoded = line.decode("utf-8", "replace").strip()
                if not decoded:
                    continue
                try:
                    payload = json.loads(decoded)
                except ValueError:
                    emit("output", decoded)
                    continue
                event_type = payload.get("type") or payload.get("event") or ""
                if (
                    engine == "codex"
                    and event_type in {"error", "turn.failed"}
                    and not (payload.get("message") or payload.get("error"))
                ):
                    emit(
                        "error",
                        "Codex run failed.",
                        {"id": "builder.event.codexFailed", "params": {}},
                    )
                    continue
                item = payload.get("item") if isinstance(payload.get("item"), dict) else {}
                if (
                    engine == "codex"
                    and event_type in {"item.started", "item.completed", "item.updated"}
                    and item.get("type") in {"file_change", "file_edit"}
                    and not (item.get("path") or item.get("file_path"))
                ):
                    emit(
                        "tool", "Files changed", {"id": "builder.event.filesChanged", "params": {}}
                    )
                    continue
                for kind, text in normalize_event(engine, payload):
                    emit(kind, text)

        async def read_stderr() -> None:
            assert process.stderr is not None
            while line := await process.stderr.readline():
                decoded = line.decode("utf-8", "replace").strip()
                if decoded:
                    stderr_parts.append(decoded)
                    if len(stderr_parts) > 50:
                        del stderr_parts[:-50]

        await asyncio.gather(read_stdout(), read_stderr())
        return_code = await process.wait()
        return return_code, _bounded_text("\n".join(stderr_parts))

    async def _terminate_process(self, run_id: str) -> None:
        process = self._processes.get(run_id)
        if process is None or process.returncode is not None:
            return
        try:
            await asyncio.to_thread(terminate_tree, process.pid)
            await asyncio.wait_for(process.wait(), timeout=2)
        except asyncio.TimeoutError:
            await asyncio.to_thread(kill_tree, process.pid)
            await process.wait()
        except ProcessLookupError:
            return

    def get(self, run_id: str, *, after: int = 0) -> dict[str, Any]:
        run = self._runs.get(run_id)
        if run is None:
            raise RunNotFoundError(run_id)
        return self._snapshot(run, after=max(0, after))

    async def wait(self, run_id: str) -> dict[str, Any]:
        run = self._runs.get(run_id)
        if run is None:
            raise RunNotFoundError(run_id)
        task = self._tasks.get(run_id)
        if task:
            try:
                await task
            except asyncio.CancelledError:
                pass
        return self._snapshot(run)

    async def cancel(self, run_id: str) -> dict[str, Any]:
        run = self._runs.get(run_id)
        if run is None:
            raise RunNotFoundError(run_id)
        if run.status not in RUNNING_STATUSES:
            return self._snapshot(run)
        run.status = "cancelled"
        run.finished_at = _now()
        self._emit(run, "status", "Run stopped.", {"id": "builder.event.stopped", "params": {}})
        await self._terminate_process(run_id)
        task = self._tasks.get(run_id)
        if task and not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        run.workspace_changes = workspace_changes(self._workspace)
        return self._snapshot(run)


builder_manager = BuilderManager()
