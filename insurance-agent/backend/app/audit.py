from sqlalchemy.orm import Session

from app.models import AuditLog


def log_action(db: Session, *, manager_id: str | None, client_id: str | None, action: str, detail: str = "") -> None:
    entry = AuditLog(manager_id=manager_id, client_id=client_id, action=action, detail=detail)
    db.add(entry)
    db.commit()
