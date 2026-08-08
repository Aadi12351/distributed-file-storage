from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from fastapi.responses import FileResponse

from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.dependencies import get_current_user

from app.models.user import User

from app.services.file_version_service import (
    list_file_versions,
    get_file_version,
    restore_file_version
)


router = APIRouter(
    prefix="/files",
    tags=["File Versions"]
)


# ============================================================
# LIST VERSION HISTORY
# ============================================================

@router.get("/{file_id}/versions")
def get_versions(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    versions, error = list_file_versions(
        db=db,
        owner_id=current_user.id,
        file_id=file_id
    )

    if error:
        raise HTTPException(
            status_code=404,
            detail=error
        )

    return [
        {
            "id": version.id,
            "file_id": version.file_id,
            "version_number": version.version_number,
            "original_filename": version.original_filename,
            "stored_filename": version.stored_filename,
            "file_size": version.file_size,
            "content_type": version.content_type,
            "storage_path": version.storage_path
        }
        for version in versions
    ]


# ============================================================
# GET SINGLE VERSION
# ============================================================

@router.get("/{file_id}/versions/{version_id}")
def get_version(
    file_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    version, error = get_file_version(
        db=db,
        owner_id=current_user.id,
        file_id=file_id,
        version_id=version_id
    )

    if error:
        raise HTTPException(
            status_code=404,
            detail=error
        )

    return {
        "id": version.id,
        "file_id": version.file_id,
        "version_number": version.version_number,
        "original_filename": version.original_filename,
        "stored_filename": version.stored_filename,
        "file_size": version.file_size,
        "content_type": version.content_type,
        "storage_path": version.storage_path
    }


# ============================================================
# DOWNLOAD VERSION
# ============================================================

@router.get("/{file_id}/versions/{version_id}/download")
def download_version(
    file_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    version, error = get_file_version(
        db=db,
        owner_id=current_user.id,
        file_id=file_id,
        version_id=version_id
    )

    if error:
        raise HTTPException(
            status_code=404,
            detail=error
        )

    return FileResponse(
        path=version.storage_path,
        filename=version.original_filename,
        media_type=version.content_type
    )


# ============================================================
# RESTORE VERSION
# ============================================================

@router.post("/{file_id}/versions/{version_id}/restore")
def restore_version(
    file_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    file, error = restore_file_version(
        db=db,
        owner_id=current_user.id,
        file_id=file_id,
        version_id=version_id
    )

    if error:
        raise HTTPException(
            status_code=404,
            detail=error
        )

    return {
        "message": "File version restored successfully",
        "file_id": file.id,
        "filename": file.original_filename,
        "file_size": file.file_size,
        "content_type": file.content_type
    }