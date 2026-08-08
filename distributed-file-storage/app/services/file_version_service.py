from pathlib import Path
import shutil

from sqlalchemy.orm import Session

from app.models.file import File
from app.models.file_version import FileVersion


# ============================================================
# CREATE VERSION SNAPSHOT
# ============================================================

def create_file_version(
    db: Session,
    file: File
):
    """
    Create a snapshot of the current physical file.

    The physical file is copied to a new version-specific
    storage location so future modifications do not destroy
    this version.
    """

    source = Path(file.storage_path)

    if not source.exists():
        return None, "Physical file not found"

    # --------------------------------------------------------
    # Find next version number
    # --------------------------------------------------------

    latest_version = (
        db.query(FileVersion)
        .filter(
            FileVersion.file_id == file.id
        )
        .order_by(
            FileVersion.version_number.desc()
        )
        .first()
    )

    if latest_version:
        next_version = latest_version.version_number + 1
    else:
        next_version = 1

    # --------------------------------------------------------
    # Create version directory
    # --------------------------------------------------------

    version_directory = (
        source.parent /
        "versions" /
        str(file.id)
    )

    version_directory.mkdir(
        parents=True,
        exist_ok=True
    )

    # --------------------------------------------------------
    # Version filename
    # --------------------------------------------------------

    version_filename = (
        f"v{next_version}_{file.stored_filename}"
    )

    version_path = (
        version_directory /
        version_filename
    )

    # --------------------------------------------------------
    # Copy physical file
    # --------------------------------------------------------

    try:
        shutil.copy2(
            source,
            version_path
        )
    except OSError as exc:
        return None, f"Unable to create version: {exc}"

    # --------------------------------------------------------
    # Save database record
    # --------------------------------------------------------

    version = FileVersion(
        file_id=file.id,
        owner_id=file.owner_id,
        version_number=next_version,
        original_filename=file.original_filename,
        stored_filename=version_filename,
        storage_path=str(version_path),
        file_size=file.file_size,
        content_type=file.content_type
    )

    db.add(version)

    db.commit()
    db.refresh(version)

    return version, None


# ============================================================
# LIST VERSION HISTORY
# ============================================================

def list_file_versions(
    db: Session,
    owner_id: int,
    file_id: int
):

    file = (
        db.query(File)
        .filter(
            File.id == file_id,
            File.owner_id == owner_id
        )
        .first()
    )

    if not file:
        return None, "File not found"

    versions = (
        db.query(FileVersion)
        .filter(
            FileVersion.file_id == file_id,
            FileVersion.owner_id == owner_id
        )
        .order_by(
            FileVersion.version_number.desc()
        )
        .all()
    )

    return versions, None


# ============================================================
# GET SINGLE VERSION
# ============================================================

def get_file_version(
    db: Session,
    owner_id: int,
    file_id: int,
    version_id: int
):

    version = (
        db.query(FileVersion)
        .filter(
            FileVersion.id == version_id,
            FileVersion.file_id == file_id,
            FileVersion.owner_id == owner_id
        )
        .first()
    )

    if not version:
        return None, "Version not found"

    if not Path(version.storage_path).exists():
        return None, "Version file is missing"

    return version, None


# ============================================================
# RESTORE VERSION
# ============================================================

def restore_file_version(
    db: Session,
    owner_id: int,
    file_id: int,
    version_id: int
):

    # --------------------------------------------------------
    # Find current file
    # --------------------------------------------------------

    file = (
        db.query(File)
        .filter(
            File.id == file_id,
            File.owner_id == owner_id
        )
        .first()
    )

    if not file:
        return None, "File not found"

    # --------------------------------------------------------
    # Find requested version
    # --------------------------------------------------------

    version = (
        db.query(FileVersion)
        .filter(
            FileVersion.id == version_id,
            FileVersion.file_id == file_id,
            FileVersion.owner_id == owner_id
        )
        .first()
    )

    if not version:
        return None, "Version not found"

    version_path = Path(
        version.storage_path
    )

    if not version_path.exists():
        return None, "Version file is missing"

    current_path = Path(
        file.storage_path
    )

    # --------------------------------------------------------
    # Save current file as a new version BEFORE restoring
    # --------------------------------------------------------

    snapshot, error = create_file_version(
        db=db,
        file=file
    )

    if error:
        return None, error

    # --------------------------------------------------------
    # Replace current physical file
    # --------------------------------------------------------

    try:

        shutil.copy2(
            version_path,
            current_path
        )

    except OSError as exc:

        db.delete(snapshot)
        db.commit()

        return None, f"Unable to restore version: {exc}"

    # --------------------------------------------------------
    # Update current File metadata
    # --------------------------------------------------------

    file.original_filename = (
        version.original_filename
    )

    file.file_size = version.file_size

    file.content_type = version.content_type

    db.commit()
    db.refresh(file)

    return file, None