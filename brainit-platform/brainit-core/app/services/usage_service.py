from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.api_key import ApiKey
from app.models.task import Task
from app.models.usage_log import UsageLog


class UsageService:
    def get_daily_limit(self, api_key: ApiKey) -> int | None:
        if api_key.usage_limit is not None:
            return api_key.usage_limit

        settings = get_settings()
        if api_key.plan_type == "enterprise":
            return None
        if api_key.plan_type == "pro":
            return settings.plan_pro_daily_limit
        return settings.plan_free_daily_limit

    def count_tasks_today_for_api_key(self, db: Session, api_key_id: str) -> int:
        today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)
        return (
            db.query(func.count(UsageLog.id))
            .filter(
                UsageLog.api_key_id == api_key_id,
                UsageLog.status == "created",
                UsageLog.timestamp >= today_start,
            )
            .scalar()
            or 0
        )

    def is_rate_limit_exceeded(self, db: Session, api_key: ApiKey) -> bool:
        daily_limit = self.get_daily_limit(api_key)
        if daily_limit is None:
            return False
        used_today = self.count_tasks_today_for_api_key(db, api_key.id)
        return used_today >= daily_limit

    def log_task_event(self, db: Session, task: Task, status: str) -> UsageLog | None:
        if not task.tenant_id:
            return None

        usage_log = UsageLog(
            task_id=task.id,
            tenant_id=task.tenant_id,
            api_key_id=task.created_by_api_key_id,
            task_type=task.task_type,
            agent_used=task.agent_used,
            status=status,
        )
        db.add(usage_log)
        db.commit()
        db.refresh(usage_log)
        return usage_log

    def get_usage_summary(self, db: Session, tenant_id: str) -> dict[str, int]:
        today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)

        total_tasks = (
            db.query(func.count(UsageLog.id))
            .filter(UsageLog.tenant_id == tenant_id, UsageLog.status == "created")
            .scalar()
            or 0
        )
        tasks_today = (
            db.query(func.count(UsageLog.id))
            .filter(
                UsageLog.tenant_id == tenant_id,
                UsageLog.status == "created",
                UsageLog.timestamp >= today_start,
            )
            .scalar()
            or 0
        )
        success_count = (
            db.query(func.count(UsageLog.id))
            .filter(UsageLog.tenant_id == tenant_id, UsageLog.status == "completed")
            .scalar()
            or 0
        )
        failure_count = (
            db.query(func.count(UsageLog.id))
            .filter(UsageLog.tenant_id == tenant_id, UsageLog.status == "failed")
            .scalar()
            or 0
        )

        return {
            "total_tasks": int(total_tasks),
            "tasks_today": int(tasks_today),
            "success_count": int(success_count),
            "failure_count": int(failure_count),
        }

    def get_limit_summary(self, db: Session, api_key: ApiKey) -> dict[str, int | str | None]:
        daily_limit = self.get_daily_limit(api_key)
        used_today = self.count_tasks_today_for_api_key(db, api_key.id)
        remaining_quota = None if daily_limit is None else max(daily_limit - used_today, 0)

        return {
            "plan_type": api_key.plan_type,
            "daily_limit": daily_limit,
            "usage_limit_override": api_key.usage_limit,
            "used_today": used_today,
            "remaining_quota": remaining_quota,
        }
