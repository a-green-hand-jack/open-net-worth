"""Application-generated import diagnostics with optional stable display metadata."""


class ImportMessage(str):
    message_id: str
    message_params: dict[str, str]

    def __new__(cls, text: str, message_id: str, **params: str):
        obj = super().__new__(cls, text)
        obj.message_id = message_id
        obj.message_params = params
        return obj
