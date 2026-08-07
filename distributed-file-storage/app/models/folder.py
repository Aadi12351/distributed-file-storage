from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    DateTime,
    Boolean
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database.database import Base


class Folder(Base):
    __tablename__ = "folders"

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

    name = Column(
        String(255),
        nullable=False
    )

    parent_folder_id = Column(
        Integer,
        ForeignKey("folders.id"),
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # ---------- Soft Delete ----------

    is_deleted = Column(
        Boolean,
        default=False,
        nullable=False
    )

    deleted_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    # ---------- Relationships ----------

    owner = relationship(
        "User",
        back_populates="folders"
    )

    parent = relationship(
        "Folder",
        remote_side=[id]
    )

    files = relationship(
        "File",
        back_populates="folder"
    )