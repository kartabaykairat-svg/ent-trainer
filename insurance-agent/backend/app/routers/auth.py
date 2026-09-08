from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.audit import log_action
from app.database import get_db
from app.deps import get_current_manager
from app.models import Manager
from app.schemas import LoginRequest, LoginResponse
from app.security import create_access_token, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    manager = db.query(Manager).filter(Manager.username == payload.username).first()
    if not manager or not verify_password(payload.password, manager.password_hash):
        # Deliberately identical error for unknown user vs wrong password.
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный логин или пароль")

    token, expires_at = create_access_token(manager.username)
    manager.last_login_at = datetime.now(timezone.utc)
    db.commit()
    log_action(db, manager_id=manager.id, client_id=None, action="login")

    return LoginResponse(
        access_token=token,
        expires_at=expires_at.isoformat(),
        manager_username=manager.username,
    )


@router.post("/logout")
def logout(manager: Manager = Depends(get_current_manager), db: Session = Depends(get_db)):
    log_action(db, manager_id=manager.id, client_id=None, action="logout")
    return {"ok": True}


@router.get("/me")
def me(manager: Manager = Depends(get_current_manager)):
    return {"username": manager.username}
