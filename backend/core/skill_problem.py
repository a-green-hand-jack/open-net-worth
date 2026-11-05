"""Optional first-party identity for a skill validation problem."""


class SkillProblem(str):
    def __new__(cls, text: str, message_id: str, **params: str):
        value = super().__new__(cls, text)
        value.message_id = message_id
        value.params = params
        return value


def problem_messages(problems: list[str]) -> list[dict]:
    return [
        {
            "text": str(problem),
            **(
                {"message_id": problem.message_id, "params": problem.params}
                if isinstance(problem, SkillProblem)
                else {}
            ),
        }
        for problem in problems
    ]
