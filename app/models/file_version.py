from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    BigInteger,
    DateTime
)

from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database.database import Base


class FileVersion(Base):

    __tablename__ = "file_versions"

    # ========================================================
    # PRIMARY KEY
    # ========================================================

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    # ========================================================
    # ORIGINAL FILE
    # ========================================================

    file_id = Column(
        Integer,
        ForeignKey("files.id"),
        nullable=False,
        index=True
    )

    # ========================================================
    # OWNER
    # ========================================================

    owner_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    # ========================================================
    # VERSION NUMBER
    # ========================================================

    version_number = Column(
        Integer,
        nullable=False
    )

    # ========================================================
    # FILE INFORMATION
    # ========================================================

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

    content_type = Column(
        String(100),
        nullable=False
    )

    # ========================================================
    # CREATED
    # ========================================================

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # ========================================================
    # RELATIONSHIPS
    # ========================================================

    file = relationship(
        "File",
        back_populates="versions"
    )

    owner = relationship(
        "User"
    )
versions = relationship(
    "FileVersion",
    back_populates="file",
    cascade="all, delete-orphan"
)