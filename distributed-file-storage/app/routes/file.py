from typing import List

from fastapi import APIRouter, Depends, UploadFile, HTTPException
from fastapi import File as FastAPIFile
from fastapi.responses import FileResponse as FastAPIFileResponse
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User

from app.schemas.file import (
    FileResponse,
    FileDetailResponse
)
from app.schemas.file_update import FileRename
from app.schemas.move_file import MoveFileRequest

from app.services.file_service import (
    upload_file,
    get_user_files,
    get_file_by_id,
    delete_file,
    rename_file,
    get_file_details,
    move_file
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return upload_file(
        db=db,
        file=file,
        owner_id=current_user.id
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