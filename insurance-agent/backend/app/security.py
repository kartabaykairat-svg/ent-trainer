"""Auth, PII-at-rest encryption and masking helpers.

Security posture for this MVP (see README "Security notes" for the full
list and what is intentionally out of scope):
  * Manager passwords are hashed with bcrypt, never stored or logged in
    the clear.
  * Every session is a short-lived JWT; the frontend must re-authenticate
    once it expires (`session_timeout_minutes`) - this is the
    "автоматический выход из системы" requirement.
  * All personally identifiable client data is encrypted at rest with a
    symmetric key (Fernet/AES128-CBC+HMAC) before it ever reaches SQLite -
    see EncryptedJSON in app/db_types.py. The key must be supplied via the
    FIELD_ENCRYPTION_KEY env var in any non-throwaway deployment.
  * IINs are masked everywhere except the single confirmed detail view a
    manager opens for that client, and even there only after explicit
    "show" - the client list, dashboard, and audit log only ever see the
    masked form.
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from cryptography.fernet import Fernet
from jose import JWTError, jwt

from app.config import get_settings

logger = logging.getLogger(__name__)

ALGORITHM = "HS256"

_fernet: Optional[Fernet] = None


def hash_password(password: str) -> str:
    # bcrypt's own 72-byte input limit - truncate rather than error, same
    # behavior passlib's bcrypt backend used to provide.
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt()).decode("ascii")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:72], password_hash.encode("ascii"))
    except ValueError:
        return False


def create_access_token(subject: str) -> tuple[str, datetime]:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.session_timeout_minutes)
    payload = {"sub": subject, "exp": expire}
    token = jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)
    return token, expire


def decode_access_token(token: str) -> Optional[str]:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError:
        return None
    return payload.get("sub")


def get_fernet() -> Fernet:
    global _fernet
    if _fernet is not None:
        return _fernet
    settings = get_settings()
    key = settings.field_encryption_key
    if not key:
        # Dev-only fallback so the app is runnable out of the box; a real
        # deployment MUST set FIELD_ENCRYPTION_KEY, or every restart makes
        # previously stored client data unreadable.
        logger.warning(
            "FIELD_ENCRYPTION_KEY is not set - generating an ephemeral key "
            "for this process only. Set FIELD_ENCRYPTION_KEY before "
            "deploying, or all stored client data becomes unreadable on "
            "the next restart."
        )
        key = Fernet.generate_key().decode()
    _fernet = Fernet(key.encode() if isinstance(key, str) else key)
    return _fernet


def encrypt_str(value: str) -> str:
    return get_fernet().encrypt(value.encode("utf-8")).decode("ascii")


def decrypt_str(token: str) -> str:
    return get_fernet().decrypt(token.encode("ascii")).decode("utf-8")


def mask_iin(iin: Optional[str]) -> str:
    """'650101300123' -> '650101******' (matches the project's 'скрыть ИИН
    в списках' requirement - first 6 digits, i.e. birth date, are kept
    because they are already visible elsewhere; the identifying suffix is
    masked)."""
    if not iin:
        return ""
    digits = "".join(ch for ch in iin if ch.isdigit())
    if len(digits) != 12:
        return "*" * len(digits) if digits else ""
    return digits[:6] + "******"


def mask_full_name(full_name: Optional[str]) -> str:
    """'Иванов Иван Иванович' -> 'Иванов Иван И.'"""
    if not full_name:
        return ""
    parts = full_name.split()
    if len(parts) <= 2:
        return full_name
    last, first, *rest = parts
    initials = " ".join(f"{p[0]}." for p in rest if p)
    return f"{last} {first} {initials}".strip()
