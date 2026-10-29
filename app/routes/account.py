import base64
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.models.preferences import AccountPreferences, SupportTicket
from app.auth.dependencies import get_current_user
from app.auth.hashing import hash_password, verify_password
from app.services.security_service import mint_session, event
from app.models.security import LoginSession

router = APIRouter(tags=["Account and support"])


def preferences(db, user):
    prefs = db.get(AccountPreferences, user.id)
    if prefs is None:
        prefs = AccountPreferences(owner_id=user.id)
        db.add(prefs)
        db.flush()
    return prefs


def profile(db, user):
    prefs = db.get(AccountPreferences, user.id)
    return {"id": user.id, "full_name": user.full_name, "email": user.email,
            "avatar": prefs.avatar if prefs else None,
            "settings": {"theme": prefs.theme if prefs else "light",
                         "density": prefs.density if prefs else "comfortable",
                         "default_view": prefs.default_view if prefs else "home",
                         "layout": prefs.layout if prefs else "list"}}


class ProfileUpdate(BaseModel):
    full_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    current_password: str | None = None
    code: str = Field(default="", max_length=32)


class PasswordUpdate(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)
    code: str = Field(default="", max_length=32)


class PreferencesUpdate(BaseModel):
    theme: Literal["light", "dark", "system"] = "light"
    density: Literal["comfortable", "compact"] = "comfortable"
    default_view: Literal["home", "drive", "recent", "starred"] = "home"
    layout: Literal["list", "grid"] = "list"


@router.get("/account")
def get_profile(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return profile(db, user)


@router.patch("/account")
def update_profile(data: ProfileUpdate, request: Request, db: Session = Depends(get_db), user=Depends(get_current_user)):
    name = data.full_name.strip()
    email = str(data.email).strip().lower()
    if not name:
        raise HTTPException(400, "Enter your name")
    prefs = preferences(db, user)
    if email != user.email:
        from app.routes.security import password_proof, Proof
        password_proof(db, user, Proof(password=data.current_password or "missing", code=data.code), request)
        if not data.current_password or not verify_password(data.current_password, user.password):
            raise HTTPException(400, "Your current password is required to change your email")
        if db.query(User).filter(User.email == email, User.id != user.id).first():
            raise HTTPException(409, "That email address is already in use")
        prefs.token_version += 1
        db.query(LoginSession).filter_by(owner_id=user.id, revoked=False).update({"revoked": True})
        user.email = email
    user.full_name = name
    current = getattr(user, "preview_session_id", None)
    if current: db.query(LoginSession).filter_by(id=current, owner_id=user.id).update({"revoked": True})
    event(db, user.id, "Profile updated", request)
    db.commit()
    return {"user": profile(db, user), "access_token": mint_session(db, user, request)}


@router.post("/account/password")
def change_password(data: PasswordUpdate, request: Request, db: Session = Depends(get_db), user=Depends(get_current_user)):
    from app.routes.security import password_proof, Proof
    password_proof(db, user, Proof(password=data.current_password, code=data.code), request)
    if not verify_password(data.current_password, user.password):
        raise HTTPException(400, "Current password is incorrect")
    if data.current_password == data.new_password:
        raise HTTPException(400, "Choose a different new password")
    prefs = preferences(db, user)
    db.query(LoginSession).filter_by(owner_id=user.id, revoked=False).update({"revoked": True})
    event(db, user.id, "Password changed", request)
    user.password = hash_password(data.new_password)
    prefs.token_version += 1
    db.commit()
    return {"message": "Password changed. Other sessions have been signed out.",
            "access_token": mint_session(db, user, request)}


@router.post("/account/avatar")
async def upload_avatar(file: UploadFile = File(...), db: Session = Depends(get_db), user=Depends(get_current_user)):
    content = await file.read(2 * 1024 * 1024 + 1)
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(413, "Choose a profile picture smaller than 2 MB")
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        mime = "image/png"
    elif content.startswith(b"\xff\xd8\xff"):
        mime = "image/jpeg"
    elif content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        mime = "image/webp"
    else:
        raise HTTPException(400, "Choose a PNG, JPEG or WebP image")
    prefs = preferences(db, user)
    prefs.avatar = "data:" + mime + ";base64," + base64.b64encode(content).decode("ascii")
    db.commit()
    return profile(db, user)


@router.delete("/account/avatar")
def remove_avatar(db: Session = Depends(get_db), user=Depends(get_current_user)):
    prefs = preferences(db, user)
    prefs.avatar = None
    db.commit()
    return profile(db, user)


@router.put("/account/settings")
def update_settings(data: PreferencesUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    prefs = preferences(db, user)
    for field, value in data.model_dump().items():
        setattr(prefs, field, value)
    db.commit()
    return profile(db, user)


class TicketCreate(BaseModel):
    category: Literal["upload", "account", "files", "sharing", "other"]
    subject: str = Field(min_length=1, max_length=180)
    description: str = Field(min_length=10, max_length=10000)


@router.post("/support", status_code=201)
def report_issue(data: TicketCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if not data.subject.strip() or len(data.description.strip()) < 10:
        raise HTTPException(400, "Add a subject and at least 10 characters describing the issue")
    ticket = SupportTicket(owner_id=user.id, category=data.category, subject=data.subject.strip(), description=data.description.strip())
    db.add(ticket)
    db.commit()
    return {"id": ticket.id, "status": ticket.status, "message": "Your report has been saved on this server."}


@router.get("/support")
def my_reports(db: Session = Depends(get_db), user=Depends(get_current_user)):
    tickets = db.query(SupportTicket).filter_by(owner_id=user.id).order_by(SupportTicket.created_at.desc()).all()
    return [{"id": t.id, "category": t.category, "subject": t.subject, "description": t.description,
             "status": t.status, "created_at": t.created_at} for t in tickets]
