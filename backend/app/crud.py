from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import models
from app.security import get_password_hash


def get_user_by_email(db: Session, email: str):
    stmt = select(models.User).where(func.lower(models.User.email) == email.lower())
    return db.scalar(stmt)


def create_user(db: Session, full_name: str, email: str, password: str, role: str = "clinician"):
    user = models.User(full_name=full_name, email=email.lower(), hashed_password=get_password_hash(password), role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def ensure_sample_invoice(db: Session, user_id: int):
    existing = db.scalar(select(models.Invoice).where(models.Invoice.user_id == user_id))
    if existing:
        return
    invoice = models.Invoice(user_id=user_id, amount=149.0, status="paid", note="Starter subscription")
    db.add(invoice)
    db.commit()


def get_invoices_for_user(db: Session, user_id: int):
    return list(db.scalars(select(models.Invoice).where(models.Invoice.user_id == user_id).order_by(models.Invoice.created_at.desc())))


def get_user_counts(db: Session):
    total_users = db.scalar(select(func.count(models.User.id))) or 0
    admins = db.scalar(select(func.count(models.User.id)).where(models.User.role == "admin")) or 0
    clinicians = db.scalar(select(func.count(models.User.id)).where(models.User.role == "clinician")) or 0
    return {"total_users": total_users, "admins": admins, "clinicians": clinicians}
