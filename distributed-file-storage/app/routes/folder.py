from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User
from app.auth.dependencies import get_current_user

from typing import List

from fastapi import HTTPException

from app.schemas.folder_update import FolderRename

from app.schemas.move_folder import MoveFolderRequest
from app.services.folder_service import (
    create_folder,
    get_user_folders,
    rename_folder,
    delete_folder,
    move_folder
)

from app.schemas.folder import (
    FolderCreate,
    FolderResponse
)

from app.services.folder_service import create_folder

router = APIRouter(
    prefix="/folders",
    tags=["Folders"]
)


@router.post(
    "",
    response_model=FolderResponse
)
def create(
    folder: FolderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_folder(
        db=db,
        owner_id=current_user.id,
        name=folder.name,
        parent_folder_id=folder.parent_folder_id
    )
@router.get(
    "",
    response_model=List[FolderResponse]
)
def list_folders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_user_folders(
        db=db,
        owner_id=current_user.id
    )
@router.patch(
    "/{folder_id}/rename",
    response_model=FolderResponse
)
def rename(
    folder_id: int,
    rename_data: FolderRename,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    folder = rename_folder(
        db=db,
        folder_id=folder_id,
        owner_id=current_user.id,
        new_name=rename_data.new_name
    )

    if folder is None:
        raise HTTPException(
            status_code=404,
            detail="Folder not found"
        )

    return folder
from app.services.folder_service import (
    create_folder,
    get_user_folders,
    rename_folder,
    delete_folder
)

@router.delete("/{folder_id}")
def delete(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deleted = delete_folder(
        db=db,
        folder_id=folder_id,
        owner_id=current_user.id
    )

    if deleted is None:
        raise HTTPException(
            status_code=404,
            detail="Folder not found"
        )

    return {
        "message": "Folder deleted successfully"
    }


@router.patch("/{folder_id}/move")
def move(
    folder_id: int,
    request: MoveFolderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    folder = move_folder(
        db=db,
        folder_id=folder_id,
        owner_id=current_user.id,
        parent_folder_id=request.parent_folder_id
    )

    if folder is None:
        raise HTTPException(
            status_code=404,
            detail="Folder not found"
        )

    if folder is False:
        raise HTTPException(
            status_code=404,
            detail="Parent folder not found"
        )

    return {
        "message": "Folder moved successfully",
        "parent_folder_id": folder.parent_folder_id
    }