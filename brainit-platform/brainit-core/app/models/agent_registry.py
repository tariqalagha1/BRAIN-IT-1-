from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AgentRegistry(Base):
    __tablename__ = "agent_registry"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[str] = mapped_column(String(32), nullable=False)
    base_url: Mapped[str] = mapped_column(String(255), nullable=False)
    card_url: Mapped[str] = mapped_column(String(255), nullable=False)
    run_url: Mapped[str] = mapped_column(String(255), nullable=False)
    health_url: Mapped[str] = mapped_column(String(255), nullable=False)
    supported_task_types: Mapped[list] = mapped_column(JSON, nullable=False)
    downstream_agents: Mapped[list | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="configured")
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_health_check_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
