from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User

from app.services.share_service import create_file_share


router = APIRouter(
    prefix="/share",
    tags=["Sharing"]
)


@router.post("/files/{file_id}")
def share_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    share = create_file_share(
        db,
        current_user.id,
        file_id
    )

    if share is None:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    return {
        "message": "File shared successfully",
        "share_id": share.id,
        "file_id": share.file_id,
        "token": share.token,
        "permission": share.permission
    }