"""Structured validation failures, retaining ValueError compatibility."""


class TriggerValidationError(ValueError):
    def __init__(self, message: str, message_id: str, **params: str):
        super().__init__(message)
        self.message_id = message_id
        self.params = params
