from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, UniqueConstraint
from app.database.database import Base


class AccountPreferences(Base):
    __tablename__ = "account_preferences"
    owner_id = Column(Integer, primary_key=True)
    avatar = Column(Text, nullable=True)
    theme = Column(String(12), default="light", nullable=False)
    density = Column(String(12), default="comfortable", nullable=False)
    default_view = Column(String(12), default="home", nullable=False)
    layout = Column(String(12), default="list", nullable=False)
    token_version = Column(Integer, default=0, nullable=False)


class SupportTicket(Base):
    __tablename__ = "support_tickets"
    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, nullable=False, index=True)
    category = Column(String(30), nullable=False)
    subject = Column(String(180), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(20), default="submitted", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class ItemMetadata(Base):
    __tablename__ = "drive_item_metadata"
    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, nullable=False)
    kind = Column(String(10), nullable=False)
    item_id = Column(Integer, nullable=False)
    modified_at = Column(DateTime, nullable=False)
    __table_args__ = (UniqueConstraint("owner_id", "kind", "item_id"),)


def touch_item(db, owner_id, kind, item_id):
    metadata = db.query(ItemMetadata).filter_by(owner_id=owner_id, kind=kind, item_id=item_id).first()
    if metadata is None:
        metadata = ItemMetadata(owner_id=owner_id, kind=kind, item_id=item_id)
        db.add(metadata)
    metadata.modified_at = datetime.now(timezone.utc)
