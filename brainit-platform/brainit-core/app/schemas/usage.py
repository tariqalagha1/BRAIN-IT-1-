from pydantic import BaseModel


class UsageSummaryResponse(BaseModel):
    total_tasks: int
    tasks_today: int
    success_count: int
    failure_count: int


class UsageLimitsResponse(BaseModel):
    plan_type: str
    daily_limit: int | None
    usage_limit_override: int | None
    used_today: int
    remaining_quota: int | None
