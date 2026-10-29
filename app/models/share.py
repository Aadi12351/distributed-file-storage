from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    DateTime
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database.database import Base


class Share(Base):
    __tablename__ = "shares"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    owner_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    file_id = Column(
        Integer,
        ForeignKey("files.id"),
        nullable=True
    )

    folder_id = Column(
        Integer,
        ForeignKey("folders.id"),
        nullable=True
    )

    token = Column(
        String(128),
        unique=True,
        nullable=False,
        index=True
    )

    permission = Column(
        String(20),
        nullable=False,
        default="view"
    )

    expires_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    password_hash = Column(
        String(255),
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    owner = relationship(
        "User"
    )

    file = relationship(
        "File"
    )

    folder = relationship(
        "Folder"
    )