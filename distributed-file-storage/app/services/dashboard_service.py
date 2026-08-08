from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.file import File
from app.models.folder import Folder
from app.models.share import Share


def get_dashboard_stats(
    db: Session,
    owner_id: int
):
    # --------------------------------------------------
    # TOTAL ACTIVE FILES
    # --------------------------------------------------

    total_files = (
        db.query(func.count(File.id))
        .filter(
            File.owner_id == owner_id,
            File.is_deleted.is_(False)
        )
        .scalar()
        or 0
    )

    # --------------------------------------------------
    # TOTAL FOLDERS
    # --------------------------------------------------

    total_folders = (
        db.query(func.count(Folder.id))
        .filter(
            Folder.owner_id == owner_id,
            Folder.is_deleted.is_(False)
        )
        .scalar()
        or 0
    )

    # --------------------------------------------------
    # TOTAL STORAGE
    # --------------------------------------------------

    total_storage_bytes = (
        db.query(func.coalesce(func.sum(File.file_size), 0))
        .filter(
            File.owner_id == owner_id,
            File.is_deleted.is_(False)
        )
        .scalar()
        or 0
    )

    # --------------------------------------------------
    # TRASHED FILES
    # --------------------------------------------------

    deleted_files = (
        db.query(func.count(File.id))
        .filter(
            File.owner_id == owner_id,
            File.is_deleted.is_(True)
        )
        .scalar()
        or 0
    )

    # --------------------------------------------------
    # SHARED FILES
    # --------------------------------------------------

    shared_files = (
        db.query(func.count(Share.id))
        .filter(
            Share.owner_id == owner_id,
            Share.file_id.isnot(None)
        )
        .scalar()
        or 0
    )

    # --------------------------------------------------
    # STORAGE CONVERSION
    # --------------------------------------------------

    total_storage_mb = round(
        total_storage_bytes / (1024 * 1024),
        2
    )

    total_storage_gb = round(
        total_storage_bytes / (1024 * 1024 * 1024),
        2
    )

    # --------------------------------------------------
    # RESPONSE
    # --------------------------------------------------

    return {
        "total_files": total_files,
        "total_folders": total_folders,
        "total_storage_bytes": total_storage_bytes,
        "total_storage_mb": total_storage_mb,
        "total_storage_gb": total_storage_gb,
        "deleted_files": deleted_files,
        "shared_files": shared_files
    }