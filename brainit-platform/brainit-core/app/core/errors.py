class AppError(Exception):
    def __init__(self, detail: str, status_code: int = 400):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


class UnsupportedTaskTypeError(AppError):
    def __init__(self, task_type: str):
        super().__init__(f"Unsupported task type: {task_type}", status_code=400)


class AgentServiceError(AppError):
    def __init__(
        self,
        detail: str,
        *,
        status_code: int = 502,
        execution_steps: list[dict] | None = None,
        a2a_calls: list[dict] | None = None,
    ):
        self.execution_steps = execution_steps or []
        self.a2a_calls = a2a_calls or []
        super().__init__(detail, status_code=status_code)
