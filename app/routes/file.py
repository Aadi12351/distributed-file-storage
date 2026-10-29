from typing import List

from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    HTTPException, Form
)

from fastapi import File as FastAPIFile
from fastapi.responses import FileResponse as FastAPIFileResponse
from fastapi.responses import HTMLResponse

from sqlalchemy.orm import Session

from html import escape

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User

from app.schemas.file import (
    FileResponse,
    FileDetailResponse
)

from app.schemas.file_update import FileRename
from app.schemas.move_file import MoveFileRequest


from app.schemas.file_version import FileVersionResponse
from app.services.file_version_service import (
    create_file_version,
    list_file_versions,
    get_file_version,  
    restore_file_version
)

from app.services.file_preview_service import (
    get_file_for_preview
)

from app.services.preview_renderer import (
    render_xlsx,
    render_docx
)

from app.services.file_service import (
    upload_file,
    get_user_files,
    get_file_by_id,
    delete_file,
    rename_file,
    get_file_details,
    move_file
)

from app.schemas.file_metadata import FileMetadataResponse

from app.services.file_metadata_service import (
    get_file_metadata
)
from app.services.file_version_service import (
    replace_file_with_version
)

router = APIRouter(
    prefix="/files",
    tags=["Files"]
)


@router.post(
    "/upload",
    response_model=FileResponse
)
def upload(
    file: UploadFile = FastAPIFile(...),
    folder_id: int | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return upload_file(
        db=db,
        file=file,
        owner_id=current_user.id,
        folder_id=folder_id
    )


@router.get(
    "",
    response_model=List[FileResponse]
)
def list_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_user_files(
        db=db,
        owner_id=current_user.id
    )


@router.get("/{file_id}/download")
def download_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    file = get_file_by_id(
        db=db,
        file_id=file_id,
        owner_id=current_user.id
    )

    return FastAPIFileResponse(
        path=file.storage_path,
        filename=file.original_filename,
        media_type=file.content_type
    )
@router.delete("/{file_id}")
def delete_uploaded_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return delete_file(
        db=db,
        file_id=file_id,
        owner_id=current_user.id
    )
@router.patch(
    "/{file_id}/rename",
    response_model=FileResponse
)
def rename(
    file_id: int,
    rename_data: FileRename,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    file = rename_file(
        db=db,
        file_id=file_id,
        owner_id=current_user.id,
        new_name=rename_data.new_name
    )

    if file is None:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    return file
@router.get(
    "/{file_id}",
    response_model=FileDetailResponse
)
def get_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    file = get_file_details(
        db=db,
        file_id=file_id,
        owner_id=current_user.id
    )

    if file is None:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    return file
@router.patch("/{file_id}/move")
def move(
    file_id: int,
    request: MoveFileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    file = move_file(
        db=db,
        file_id=file_id,
        owner_id=current_user.id,
        folder_id=request.folder_id
    )

    if file is None:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    return {
    "message": "File moved successfully",
    "folder_id": file.folder_id,
    "folder_name": file.folder.name if file.folder else None
}


@router.get("/{file_id}/preview")
def preview_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.routes.preview import owned, ticket, content
    file = owned(db, current_user.id, file_id)
    return content(file_id, ticket(db, current_user, file), db=db)


@router.get(
    "/{file_id}/metadata",
    response_model=FileMetadataResponse
)
def file_metadata(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    metadata = get_file_metadata(
        db=db,
        owner_id=current_user.id,
        file_id=file_id
    )

    if metadata is None:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    return metadata

@router.post(
    "/{file_id}/versions",
    response_model=FileVersionResponse
)
def create_version(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    file = get_file_by_id(
        db=db,
        file_id=file_id,
        owner_id=current_user.id
    )

    if file is None:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    version, error = create_file_version(
        db=db,
        file=file
    )

    if error:
        raise HTTPException(
            status_code=400,
            detail=error
        )

    return version
@router.get(
    "/{file_id}/versions",
    response_model=List[FileVersionResponse]
)
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

    return versions
# ============================================================
# GET SINGLE VERSION
# ============================================================

@router.get(
    "/{file_id}/versions/{version_id}",
    response_model=FileVersionResponse
)
def get_single_version(
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

    return version
@router.get(
    "/{file_id}/versions/{version_id}/download"
)
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

    return FastAPIFileResponse(
        path=version.storage_path,
        filename=version.original_filename,
        media_type=version.content_type
    )
@router.post(
    "/{file_id}/versions/{version_id}/restore"
)
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
        "restored_from_version": version_id,
        "filename": file.original_filename,
        "file_size": file.file_size,
        "content_type": file.content_type
    }
@router.put("/{file_id}/replace")
def replace(
    file_id: int,
    file: UploadFile = FastAPIFile(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    updated_file, error = replace_file_with_version(
        db=db,
        owner_id=current_user.id,
        file_id=file_id,
        new_file=file
    )

    if error:
        raise HTTPException(
            status_code=404,
            detail=error
        )

    return {
        "message": "File replaced successfully",
        "file_id": updated_file.id,
        "filename": updated_file.original_filename,
        "file_size": updated_file.file_size,
        "content_type": updated_file.content_type
    }