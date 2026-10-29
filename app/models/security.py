from sqlalchemy import Column, Integer, String, Text, Boolean, Float
from app.database.database import Base


class AccountSecurity(Base):
    __tablename__ = "account_security"
    owner_id = Column(Integer, primary_key=True)
    enabled = Column(Boolean, default=False, nullable=False)
    secret = Column(Text, nullable=True)
    pending_secret = Column(Text, nullable=True)
    pending_until = Column(Float, default=0, nullable=False)
    recovery_hashes = Column(Text, default="[]", nullable=False)
    last_step = Column(Integer, default=-1, nullable=False)


class LoginSession(Base):
    __tablename__ = "login_sessions"
    id = Column(String(64), primary_key=True)
    owner_id = Column(Integer, index=True, nullable=False)
    device = Column(String(240), nullable=False)
    created_at = Column(Float, nullable=False)
    expires_at = Column(Float, nullable=False)
    revoked = Column(Boolean, default=False, nullable=False)


class SecurityEvent(Base):
    __tablename__ = "security_events"
    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, index=True, nullable=False)
    event = Column(String(100), nullable=False)
    device = Column(String(240), nullable=False)
    created_at = Column(Float, nullable=False)


class LoginGate(Base):
    __tablename__ = "login_gates"
    key = Column(String(64), primary_key=True)
    count = Column(Integer, default=0, nullable=False)
    started_at = Column(Float, nullable=False)
