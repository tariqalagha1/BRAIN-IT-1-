from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterPayload(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginPayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    role: str
    created_at: datetime


class DashboardSummary(BaseModel):
    active_patients: int
    completed_sessions: int
    open_tasks: int
    monthly_revenue: float


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    amount: float
    status: str
    note: str
    created_at: datetime


class BillingSummary(BaseModel):
    plans: list[str]
    invoices: list[InvoiceResponse]


class AdminSummary(BaseModel):
    total_users: int
    admins: int
    clinicians: int
