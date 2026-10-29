from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session

from app.database.session import get_db

from app.auth.dependencies import get_current_user

from app.models.user import User

from app.services.trash_service import (
    move_file_to_trash,
    restore_file,
    get_trash
)

router = APIRouter(
    prefix="/trash",
    tags=["Trash"]
)


@router.patch("/files/{file_id}")
def trash_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    file = move_file_to_trash(
        db,
        current_user.id,
        file_id
    )

    if file is None:
        raise HTTPException(
            404,
            "File not found"
        )

    return {
        "message": "Moved to trash"
    }


@router.patch("/files/{file_id}/restore")
def restore(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    file = restore_file(
        db,
        current_user.id,
        file_id
    )

    if file is None:
        raise HTTPException(
            404,
            "File not found"
        )

    return {
        "message": "Restored"
    }

@router.get("")
def trash(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    return get_trash(
        db,
        current_user.id
    )