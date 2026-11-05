"""Public, non-secret parameters permitted on move presentation messages."""

import json
from pathlib import Path

MOVE_MESSAGE_PARAMETERS: dict[str, list[str]] = json.loads(
    Path(__file__).with_name("move_message_contract.json").read_text(encoding="utf-8")
)


def valid_move_message(message_id: object, params: object) -> bool:
    if not isinstance(message_id, str) or message_id not in MOVE_MESSAGE_PARAMETERS:
        return False
    if not isinstance(params, dict) or set(params) != set(MOVE_MESSAGE_PARAMETERS[message_id]):
        return False
    return all(type(value) is int and value >= 0 for value in params.values())
