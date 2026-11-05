"""Conservative schema enum provenance for first-party approval cards."""

from __future__ import annotations

import hashlib
import json
from functools import lru_cache
from typing import Any


def _resolve(root: dict, ref: str) -> dict | None:
    if not ref.startswith("#/"):
        return None
    node: Any = root
    for segment in ref[2:].split("/"):
        if not isinstance(node, dict):
            return None
        node = node.get(segment.replace("~1", "/").replace("~0", "~"))
    return node if isinstance(node, dict) else None


def schema_enums(schema: dict) -> dict[str, list[str]]:
    """Return only closed, literal string enums, keyed by property path.

    Object keys from additionalProperties are user-controlled and are never enumerated.
    An unrestricted string alternative makes that path unsafe and removes its allowlist.
    """
    candidates: dict[str, set[str]] = {}
    open_paths: set[str] = set()

    def walk(node: Any, path: str, refs: frozenset[str]) -> None:
        if not isinstance(node, dict):
            return
        ref = node.get("$ref")
        if isinstance(ref, str) and ref not in refs:
            target = _resolve(schema, ref)
            if target is not None:
                walk(target, path, refs | {ref})
        enum = node.get("enum")
        if path and isinstance(enum, list):
            candidates.setdefault(path, set()).update(v for v in enum if isinstance(v, str))
        elif path and node.get("type") == "string" and "const" not in node and "$ref" not in node:
            open_paths.add(path)
        elif path and not node:
            open_paths.add(path)
        const = node.get("const")
        if path and isinstance(const, str):
            candidates.setdefault(path, set()).add(const)
        props = node.get("properties")
        if isinstance(props, dict):
            for name, child in props.items():
                walk(child, f"{path}.{name}" if path else name, refs)
        items = node.get("items")
        if isinstance(items, dict):
            walk(items, f"{path}.*" if path else "*", refs)
        for keyword in ("anyOf", "oneOf", "allOf"):
            alternatives = node.get(keyword)
            if isinstance(alternatives, list):
                for child in alternatives:
                    walk(child, path, refs)

    walk(schema, "", frozenset())
    return {
        path: sorted(values)
        for path, values in sorted(candidates.items())
        if values and path not in open_paths
    }


def schema_fields(schema: dict) -> list[str]:
    """Enumerate declared properties, excluding keys from open dictionaries."""
    fields: set[str] = set()
    open_objects: set[str] = set()

    def walk(node: Any, path: str, refs: frozenset[str]) -> None:
        if not isinstance(node, dict):
            return
        ref = node.get("$ref")
        if isinstance(ref, str) and ref not in refs:
            target = _resolve(schema, ref)
            if target is not None:
                walk(target, path, refs | {ref})
        props = node.get("properties")
        if path and (not node or (node.get("type") == "object" and not props)):
            open_objects.add(path)
        if isinstance(props, dict):
            for name, child in props.items():
                field = f"{path}.{name}" if path else name
                fields.add(field)
                walk(child, field, refs)
        if isinstance(node.get("items"), dict):
            walk(node["items"], f"{path}.*" if path else "*", refs)
        for keyword in ("anyOf", "oneOf", "allOf"):
            if isinstance(node.get(keyword), list):
                for child in node[keyword]:
                    walk(child, path, refs)

    walk(schema, "", frozenset())
    return sorted(
        field for field in fields if not any(field.startswith(p + ".") for p in open_objects)
    )


def snapshot() -> dict:
    from backend.ai.tools.registry import build_tool_schemas

    tools = sorted(build_tool_schemas(), key=lambda tool: tool["name"])
    return {
        "fields": {tool["name"]: schema_fields(tool["input_schema"]) for tool in tools},
        "enums": {
            tool["name"]: values for tool in tools if (values := schema_enums(tool["input_schema"]))
        },
    }


def snapshot_content() -> str:
    return json.dumps(snapshot(), ensure_ascii=False, indent=2) + "\n"


@lru_cache(maxsize=1)
def schema_version() -> str:
    return hashlib.sha256(snapshot_content().encode("utf-8")).hexdigest()


def approval_marker(tool_name: str) -> dict[str, str]:
    from backend.ai.tools.registry import registered_tool_names

    return {"enum_schema_version": schema_version()} if tool_name in registered_tool_names() else {}
