import ast
import json
from pathlib import Path

from backend.core.move_messages import MOVE_MESSAGE_PARAMETERS, valid_move_message
from backend.services.move_secrets import _FIXES


def test_move_message_contract_allows_only_registered_public_numeric_parameters():
    assert valid_move_message("move.parts_missing", {"missing_parts": 3})
    assert not valid_move_message("move.parts_missing", {"missing_parts": -1})
    assert not valid_move_message("move.parts_missing", {"missing_parts": True})
    assert not valid_move_message("move.parts_missing", {"missing_parts": 3, "token": "secret"})
    assert not valid_move_message("move.unknown_code", {})


def test_declared_move_messages_are_registered():
    root = Path(__file__).resolve().parents[1]
    declared = set()
    for name in (
        "backend/api/move.py",
        "backend/services/move.py",
        "backend/services/move_secrets.py",
    ):
        tree = ast.parse((root / name).read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.keyword) and node.arg in {"message_id", "error_message_id"}:
                if isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
                    declared.add(node.value.value)
            if (
                isinstance(node, ast.Call)
                and isinstance(node.func, ast.Name)
                and node.func.id == "MovePresentationError"
                and len(node.args) >= 3
            ):
                value = node.args[2]
                if isinstance(value, ast.Constant) and isinstance(value.value, str):
                    declared.add(value.value)
            if isinstance(node, ast.Assign) and any(
                isinstance(target, ast.Name) and target.id == "failure_id"
                for target in node.targets
            ):
                if isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
                    declared.add(node.value.value)
    assert declared <= MOVE_MESSAGE_PARAMETERS.keys()


def test_move_checklist_registry_matches_the_service():
    path = Path(__file__).resolve().parents[1] / "backend/core/move_checklist_contract.json"
    assert set(json.loads(path.read_text(encoding="utf-8"))) == {*_FIXES, "secrets_not_sent"}
