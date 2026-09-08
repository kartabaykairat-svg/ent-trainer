from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Manager
from app.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_manager(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Manager:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Сессия истекла или недействительна. Пожалуйста, войдите снова.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise unauthorized
    username = decode_access_token(token)
    if not username:
        raise unauthorized
    manager = db.query(Manager).filter(Manager.username == username).first()
    if not manager:
        raise unauthorized
    return manager
