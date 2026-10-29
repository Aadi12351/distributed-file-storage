from fastapi import APIRouter, Depends, HTTPException, Request, Form
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.auth.jwt_handler import create_access_token
from app.database.session import get_db
from app.schemas.user import UserRegister
from app.schemas.login import UserLogin
from app.models.preferences import AccountPreferences
from app.models.security import AccountSecurity
from app.models.user import User
from app.services.security_service import gate, clear_account_gate, event, mint_session, verify_code
from app.services.auth_service import register_user, login_user

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/register")
def register(
    user: UserRegister,
    request: Request,
    db: Session = Depends(get_db)
):
    gate(db, request, "registration:" + (request.client.host if request.client else "unknown"))
    new_user = register_user(
        db=db,
        full_name=user.full_name,
        email=user.email,
        password=user.password
    )

    if new_user is None:
        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )

    return {
        "message": "User Registered Successfully",
        "user": {
            "id": new_user.id,
            "full_name": new_user.full_name,
            "email": new_user.email
        }
    }


@router.post("/login")
def login(
    request: Request,
    otp: str | None = Form(None),
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    gate(db, request, form_data.username)
    existing_user = login_user(
        db=db,
        email=form_data.username,
        password=form_data.password
    )

    if existing_user is None:
        known = db.query(User).filter_by(email=form_data.username.strip().lower()).first()
        if known:
            event(db, known.id, "Sign-in failed", request)
            db.commit()
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    security = db.get(AccountSecurity, existing_user.id)
    if security and security.enabled and not verify_code(db, security, otp):
        event(db, existing_user.id, "Two-step verification failed", request)
        db.commit()
        raise HTTPException(401, "Enter a valid authenticator or recovery code")
    clear_account_gate(db, existing_user.email)
    event(db, existing_user.id, "Signed in", request)
    token = mint_session(db, existing_user, request)

    return {
        "access_token": token,
        "token_type": "bearer"
    }