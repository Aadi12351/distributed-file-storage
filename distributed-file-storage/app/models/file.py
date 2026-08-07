from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    BigInteger,
    DateTime,
    Boolean
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database.database import Base


class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)

    owner_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    original_filename = Column(
        String(255),
        nullable=False
    )

    stored_filename = Column(
        String(255),
        nullable=False
    )

    storage_path = Column(
        String(500),
        nullable=False
    )

    file_size = Column(
        BigInteger,
        nullable=False
    )

    folder_id = Column(
        Integer,
        ForeignKey("folders.id"),
        nullable=True
    )

    content_type = Column(
        String(100),
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # -------- Soft Delete --------

    is_deleted = Column(
        Boolean,
        default=False,
        nullable=False
    )

    deleted_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    # -------- Relationships --------

    owner = relationship(
        "User",
        back_populates="files"
    )

    folder = relationship(
        "Folder",
        back_populates="files"
    )