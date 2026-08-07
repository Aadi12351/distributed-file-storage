from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.file import File
from app.models.folder import Folder


def move_file_to_trash(
    db: Session,
    owner_id: int,
    file_id: int
):

    file = (
        db.query(File)
        .filter(
            File.id == file_id,
            File.owner_id == owner_id,
            File.is_deleted.is_(False)
        )
        .first()
    )

    if not file:
        return None

    file.is_deleted = True
    file.deleted_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(file)

    return file


def restore_file(
    db: Session,
    owner_id: int,
    file_id: int
):

    file = (
        db.query(File)
        .filter(
            File.id == file_id,
            File.owner_id == owner_id,
            File.is_deleted.is_(True)
        )
        .first()
    )

    if not file:
        return None

    file.is_deleted = False
    file.deleted_at = None

    db.commit()
    db.refresh(file)

    return file

def get_trash(
    db: Session,
    owner_id: int
):

    files = (
        db.query(File)
        .filter(
            File.owner_id == owner_id,
            File.is_deleted.is_(True)
        )
        .order_by(
            File.deleted_at.desc(),
            File.original_filename.asc()
        )
        .all()
    )

    folders = (
        db.query(Folder)
        .filter(
            Folder.owner_id == owner_id,
            Folder.is_deleted.is_(True)
        )
        .order_by(
            Folder.deleted_at.desc(),
            Folder.name.asc()
        )
        .all()
    )

    return {
        "files": files,
        "folders": folders
    }