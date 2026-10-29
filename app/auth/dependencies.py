from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.database.session import get_db
from app.models.user import User
from app.models.preferences import AccountPreferences
from app.models.security import LoginSession
import time

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/login"
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):

    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials"
    )

    try:

        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )

        email = payload.get("sub")

        if email is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if user is None:
        raise credentials_exception

    prefs = db.get(AccountPreferences, user.id)
    if payload.get("ver", 0) != (prefs.token_version if prefs else 0):
        raise credentials_exception
    if payload.get("sid"):
        session = db.get(LoginSession, payload["sid"])
        if not session or session.owner_id != user.id or session.revoked or session.expires_at <= time.time():
            raise credentials_exception
    user.preview_session_id = payload.get("sid")
    return user