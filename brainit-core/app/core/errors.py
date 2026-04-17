class AppError(Exception):
    def __init__(self, detail: str, status_code: int = 400):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


class UnsupportedTaskTypeError(AppError):
    def __init__(self, task_type: str):
        super().__init__(f"Unsupported task type: {task_type}", status_code=400)
