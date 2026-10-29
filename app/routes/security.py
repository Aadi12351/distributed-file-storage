import base64
import hashlib
import json
import secrets
import time
from urllib.parse import quote
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from jose import jwt
from sqlalchemy.orm import Session
from app.auth.dependencies import get_current_user, oauth2_scheme
from app.auth.hashing import verify_password
from app.config.settings import settings
from app.database.session import get_db
from app.models.security import AccountSecurity, LoginSession, SecurityEvent
from app.routes.account import preferences
from app.services.security_service import protect, reveal, totp, verify_code, gate, event, mint_session

router = APIRouter(prefix="/security", tags=["Account security"])

class Proof(BaseModel):
    password: str = Field(min_length=1, max_length=128)
    code: str = Field(default="", max_length=32)

class Code(BaseModel):
    code: str = Field(min_length=6, max_length=32)

def sid(token):
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]).get("sid")

def security_row(db, user):
    row = db.get(AccountSecurity, user.id)
    if row is None:
        row = AccountSecurity(owner_id=user.id)
        db.add(row)
        db.flush()
    return row

def password_proof(db, user, data, request, second_factor=True):
    gate(db, request, f"security:{user.id}")
    if not verify_password(data.password, user.password):
        raise HTTPException(400, "Current password is incorrect")
    row = db.get(AccountSecurity, user.id)
    if second_factor and row and row.enabled and not verify_code(db, row, data.code):
        raise HTTPException(400, "Enter a valid authenticator or recovery code")

def rotate(db, user, request):
    prefs = preferences(db, user)
    prefs.token_version += 1
    db.query(LoginSession).filter_by(owner_id=user.id, revoked=False).update({"revoked": True})
    return mint_session(db, user, request)

@router.post("/session")
def register_session(request: Request, db: Session = Depends(get_db), user=Depends(get_current_user), token: str = Depends(oauth2_scheme)):
    return {"access_token": None if sid(token) else mint_session(db, user, request)}

@router.get("")
def overview(db: Session = Depends(get_db), user=Depends(get_current_user), token: str = Depends(oauth2_scheme)):
    row = db.get(AccountSecurity, user.id)
    current = sid(token)
    sessions = db.query(LoginSession).filter(LoginSession.owner_id == user.id, LoginSession.revoked.is_(False), LoginSession.expires_at > time.time()).order_by(LoginSession.created_at.desc()).limit(50).all()
    events = db.query(SecurityEvent).filter_by(owner_id=user.id).order_by(SecurityEvent.created_at.desc()).limit(30).all()
    return {"two_factor_enabled": bool(row and row.enabled), "recovery_codes_remaining": len(json.loads(row.recovery_hashes)) if row else 0,
            "sessions": [{"id": s.id, "device": s.device, "created_at": s.created_at, "expires_at": s.expires_at, "current": s.id == current} for s in sessions],
            "events": [{"id": e.id, "event": e.event, "device": e.device, "created_at": e.created_at} for e in events],
            "max_upload_mb": settings.MAX_UPLOAD_MB, "current_session_tracked": bool(current)}

@router.post("/2fa/setup")
def setup(data: Proof, request: Request, db: Session = Depends(get_db), user=Depends(get_current_user)):
    password_proof(db, user, data, request, second_factor=False)
    row = security_row(db, user)
    if row.enabled: raise HTTPException(409, "Two-step verification is already enabled")
    secret = base64.b32encode(secrets.token_bytes(20)).decode().rstrip("=")
    row.pending_secret, row.pending_until = protect(secret), time.time() + 600
    db.commit()
    uri = f"otpauth://totp/{quote('File Drive:' + user.email, safe='')}?secret={secret}&issuer=File%20Drive&algorithm=SHA1&digits=6&period=30"
    return {"secret": secret, "uri": uri}

@router.post("/2fa/enable")
def enable(data: Code, request: Request, db: Session = Depends(get_db), user=Depends(get_current_user)):
    gate(db, request, f"2fa-enable:{user.id}")
    row = security_row(db, user)
    if row.enabled or not row.pending_secret or row.pending_until < time.time():
        raise HTTPException(400, "Start a fresh authenticator setup")
    secret = reveal(row.pending_secret)
    step = int(time.time() // 30)
    matched = next((s for s in (step - 1, step, step + 1) if secrets.compare_digest(totp(secret, s), data.code.strip())), None)
    if matched is None:
        raise HTTPException(400, "That code is incorrect. Check your device clock and try again.")
    codes = [secrets.token_hex(8) for _ in range(8)]
    row.secret, row.pending_secret, row.pending_until = row.pending_secret, None, 0
    row.enabled, row.last_step = True, matched
    row.recovery_hashes = json.dumps([hashlib.sha256(code.encode()).hexdigest() for code in codes])
    event(db, user.id, "Two-step verification enabled", request)
    token = rotate(db, user, request)
    return {"access_token": token, "recovery_codes": ["-".join(c[i:i+4] for i in range(0,16,4)) for c in codes]}

@router.post("/2fa/disable")
def disable(data: Proof, request: Request, db: Session = Depends(get_db), user=Depends(get_current_user)):
    password_proof(db, user, data, request)
    row = security_row(db, user)
    row.enabled, row.secret, row.pending_secret, row.recovery_hashes, row.last_step = False, None, None, "[]", -1
    event(db, user.id, "Two-step verification disabled", request)
    return {"access_token": rotate(db, user, request)}

@router.post("/2fa/recovery")
def regenerate(data: Proof, request: Request, db: Session = Depends(get_db), user=Depends(get_current_user)):
    password_proof(db, user, data, request)
    row = security_row(db, user)
    if not row.enabled: raise HTTPException(400, "Enable two-step verification first")
    codes = [secrets.token_hex(8) for _ in range(8)]
    row.recovery_hashes = json.dumps([hashlib.sha256(c.encode()).hexdigest() for c in codes])
    event(db, user.id, "Recovery codes regenerated", request)
    return {"access_token": rotate(db, user, request), "recovery_codes": ["-".join(c[i:i+4] for i in range(0,16,4)) for c in codes]}

@router.post("/sessions/revoke-others")
def revoke_others(data: Proof, request: Request, db: Session = Depends(get_db), user=Depends(get_current_user)):
    password_proof(db, user, data, request)
    event(db, user.id, "Other sessions signed out", request)
    return {"access_token": rotate(db, user, request)}

@router.delete("/sessions/{session_id}")
def revoke_session(session_id: str, request: Request, db: Session = Depends(get_db), user=Depends(get_current_user), token: str = Depends(oauth2_scheme)):
    row = db.get(LoginSession, session_id)
    if not row or row.owner_id != user.id: raise HTTPException(404, "Session not found")
    if row.id == sid(token): raise HTTPException(400, "Use Sign out to close your current session")
    row.revoked = True
    event(db, user.id, "Session signed out", request)
    db.commit()
    return {"message": "Session signed out"}

@router.post("/logout")
def logout(request: Request, db: Session = Depends(get_db), user=Depends(get_current_user), token: str = Depends(oauth2_scheme)):
    row = db.get(LoginSession, sid(token)) if sid(token) else None
    if row: row.revoked = True
    else:
        preferences(db, user).token_version += 1
        db.query(LoginSession).filter_by(owner_id=user.id, revoked=False).update({"revoked": True})
    event(db, user.id, "Signed out", request)
    db.commit()
    return {"message": "Signed out"}
