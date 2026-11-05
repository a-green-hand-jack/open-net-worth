"""Run-scoped workspace files and executor work events."""

import json

from backend.ai.tools.registry import tool
from backend.core.errors import ValidationError
from backend.core.trading_runtime import trading_context
from backend.services.trading.work_records import record_work, workspace_files, write_workspace_file


def _run_id():
    context = trading_context()
    if context is None:
        raise ValidationError("Workspace tools require a server-owned trading run")
    return context.run_id


def _result(value):
    return json.dumps(value, ensure_ascii=False, default=str), None


@tool(
    "write_trading_file",
    description="Save an immutable version of a relative workspace research/code/test file. No host filesystem access.",
    input_schema={
        "type": "object",
        "properties": {
            "name": {"type": "string", "maxLength": 160},
            "content": {"type": "string", "maxLength": 64000},
        },
        "required": ["name", "content"],
        "additionalProperties": False,
    },
    mutates=("trading",),
)
async def write_trading_file(data):
    row = write_workspace_file(_run_id(), data["name"], data["content"])
    return _result({"event_id": row["id"], **row["payload"]})


@tool(
    "read_trading_files",
    description="List workspace files, or read an exact saved version by name/version.",
    input_schema={
        "type": "object",
        "properties": {
            "name": {"type": "string", "maxLength": 160},
            "version": {"type": "integer", "minimum": 1},
        },
        "additionalProperties": False,
    },
    mutates=(),
)
async def read_trading_files(data):
    return _result(workspace_files(_run_id(), **data))


@tool(
    "record_trading_work",
    description="Publish actual executor output, analysis, actor activity, tool evidence or wait state. Never invent unreported reasoning.",
    input_schema={
        "type": "object",
        "properties": {
            "kind": {
                "type": "string",
                "enum": [
                    "input",
                    "output",
                    "analysis",
                    "reasoning",
                    "tool_call",
                    "tool_result",
                    "error",
                    "wait",
                    "actor",
                    "native_event",
                ],
            },
            "payload": {"type": "object"},
        },
        "required": ["kind", "payload"],
        "additionalProperties": False,
    },
    mutates=("trading",),
)
async def record_trading_work(data):
    return _result(record_work(_run_id(), data["kind"], data["payload"]))
