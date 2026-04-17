import hashlib
import hmac
import secrets
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.api_key import ApiKey
from app.schemas.api_key import ApiKeyCreateRequest


class ApiKeyService:
    def generate_plaintext_key(self) -> str:
        return f"brainit_{secrets.token_urlsafe(24)}"

    def hash_key(self, plaintext_key: str) -> str:
        return hashlib.sha256(plaintext_key.encode("utf-8")).hexdigest()

    def create_key(self, db: Session, payload: ApiKeyCreateRequest) -> tuple[ApiKey, str]:
        plaintext_key = self.generate_plaintext_key()
        key_hash = self.hash_key(plaintext_key)
        key = ApiKey(
            key_hash=key_hash,
            key_prefix=plaintext_key[:12],
            client_name=payload.client_name,
            tenant_id=payload.tenant_id,
            plan_type=payload.plan_type,
            usage_limit=payload.usage_limit,
            is_active=True,
        )
        db.add(key)
        db.commit()
        db.refresh(key)
        return key, plaintext_key

    def list_keys(self, db: Session) -> list[ApiKey]:
        return db.query(ApiKey).order_by(ApiKey.created_at.desc()).all()

    def get_key(self, db: Session, key_id: str) -> ApiKey | None:
        return db.get(ApiKey, key_id)

    def verify_active_key(self, db: Session, plaintext_key: str) -> ApiKey | None:
        key_hash = self.hash_key(plaintext_key)
        api_key = db.query(ApiKey).filter(ApiKey.key_hash == key_hash, ApiKey.is_active.is_(True)).one_or_none()
        if api_key is None:
            return None
        if not hmac.compare_digest(api_key.key_hash, key_hash):
            return None
        return api_key

    def mark_used(self, db: Session, api_key: ApiKey) -> ApiKey:
        api_key.last_used_at = datetime.utcnow()
        db.add(api_key)
        db.commit()
        db.refresh(api_key)
        return api_key

    def disable_key(self, db: Session, api_key: ApiKey) -> ApiKey:
        api_key.is_active = False
        db.add(api_key)
        db.commit()
        db.refresh(api_key)
        return api_key
