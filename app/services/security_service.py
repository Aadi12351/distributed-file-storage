import base64
import hashlib
import hmac
import json
import secrets
import struct
import time
from cryptography.fernet import Fernet
from fastapi import HTTPException
from app.auth.jwt_handler import create_access_token
from app.config.settings import settings
from app.models.preferences import AccountPreferences
from app.models.security import AccountSecurity, LoginSession, SecurityEvent, LoginGate


def cipher():
    key = hashlib.sha256(("file-drive-2fa:" + settings.SECRET_KEY).encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def protect(secret):
    return cipher().encrypt(secret.encode()).decode()


def reveal(secret):
    return cipher().decrypt(secret.encode()).decode()


def totp(secret, step):
    raw = base64.b32decode(secret + "=" * (-len(secret) % 8))
    digest = hmac.new(raw, struct.pack(">Q", step), hashlib.sha1).digest()
    offset = digest[-1] & 15
    value = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7fffffff
    return f"{value % 1000000:06d}"


def verify_code(db, security, code, consume=True):
    code = (code or "").replace(" ", "").replace("-", "")
    if len(code) == 6 and code.isdigit():
        step = int(time.time() // 30)
        secret = reveal(security.secret)
        for candidate in (step, step - 1, step + 1):
            if candidate <= security.last_step: continue
            if hmac.compare_digest(totp(secret, candidate), code):
                if consume:
                    changed = db.query(AccountSecurity).filter(AccountSecurity.owner_id == security.owner_id, AccountSecurity.last_step == security.last_step).update({"last_step": candidate}, synchronize_session=False)
                    if changed != 1: return False
                    db.expire(security)
                return True
    hashes = json.loads(security.recovery_hashes)
    digest = hashlib.sha256(code.lower().encode()).hexdigest()
    for saved in hashes:
        if hmac.compare_digest(saved, digest):
            if consume:
                old = security.recovery_hashes
                hashes.remove(saved)
                changed = db.query(AccountSecurity).filter(AccountSecurity.owner_id == security.owner_id, AccountSecurity.recovery_hashes == old).update({"recovery_hashes": json.dumps(hashes)}, synchronize_session=False)
                if changed != 1: return False
                db.expire(security)
            return True
    return False


def device(request):
    return request.headers.get("user-agent", "Unknown browser")[:240]


def event(db, uid, name, request):
    db.add(SecurityEvent(owner_id=uid, event=name, device=device(request), created_at=time.time()))


def mint_session(db, user, request):
    prefs = db.get(AccountPreferences, user.id)
    sid = secrets.token_urlsafe(32)
    now = time.time()
    session = LoginSession(id=sid, owner_id=user.id, device=device(request), created_at=now,
                           expires_at=now + min(settings.ACCESS_TOKEN_EXPIRE_MINUTES, 60) * 60)
    db.add(session)
    token = create_access_token({"sub": user.email, "ver": prefs.token_version if prefs else 0, "sid": sid})
    db.commit()
    return token


def gate(db, request, account):
    now = time.time()
    keys = [("account:" + account.strip().lower(), 5), ("ip:" + (request.client.host if request.client else "unknown"), 30)]
    for raw, limit in keys:
        key = hashlib.sha256(raw.encode()).hexdigest()
        row = db.get(LoginGate, key)
        if row and now - row.started_at < 900 and row.count >= limit:
            retry = max(1, int(900 - (now - row.started_at)))
            raise HTTPException(429, "Too many attempts. Try again later.", headers={"Retry-After": str(retry)})
    for raw, _ in keys:
        key = hashlib.sha256(raw.encode()).hexdigest()
        row = db.get(LoginGate, key)
        if row is None:
            db.add(LoginGate(key=key, count=1, started_at=now))
        elif now - row.started_at >= 900:
            row.count, row.started_at = 1, now
        else:
            db.query(LoginGate).filter_by(key=key).update({LoginGate.count: LoginGate.count + 1})
    db.commit()


def clear_account_gate(db, account):
    key = hashlib.sha256(("account:" + account.strip().lower()).encode()).hexdigest()
    db.query(LoginGate).filter_by(key=key).delete()
