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

from app.schemas.share import ShareCreate

from app.services.share_service import (
    create_file_share,
    get_shared_file,
    get_shared_file_for_download,
    list_my_shares,
    revoke_share
)


router = APIRouter(
    prefix="/share",
    tags=["Share"]
)


# ============================================================
# LIST MY SHARES
# ============================================================

@router.get("")
def get_my_shares(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return list_my_shares(
        db=db,
        owner_id=current_user.id
    )


# ============================================================
# CREATE FILE SHARE
# ============================================================

@router.post("/files/{file_id}")
def share_file(
    file_id: int,
    data: ShareCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    share, error = create_file_share(
        db=db,
        owner_id=current_user.id,
        file_id=file_id,
        permission=data.permission,
        expires_at=data.expires_at
    )

    if error:

        if error.startswith("Invalid"):
            status_code = 400

        elif error.startswith("Expiration"):
            status_code = 400

        else:
            status_code = 404

        raise HTTPException(
            status_code=status_code,
            detail=error
        )

    return {
        "message": "File shared successfully",
        "share_id": share.id,
        "file_id": share.file_id,
        "token": share.token,
        "permission": share.permission,
        "expires_at": share.expires_at
    }


# ============================================================
# REVOKE SHARE
# ============================================================

@router.delete("/{share_id}")
def delete_share(
    share_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    share = revoke_share(
        db=db,
        owner_id=current_user.id,
        share_id=share_id
    )

    if share is None:
        raise HTTPException(
            status_code=404,
            detail="Share not found"
        )

    return {
        "message": "Share revoked successfully",
        "share_id": share_id
    }


# ============================================================
# ACCESS PUBLIC SHARE
# ============================================================

@router.get("/{token}")
def access_shared_file(
    token: str,
    db: Session = Depends(get_db)
):
    result, error = get_shared_file(
        db=db,
        token=token
    )

    if error:
        raise HTTPException(
            status_code=404,
            detail=error
        )

    return result


# ============================================================
# DOWNLOAD PUBLIC SHARED FILE
# ============================================================

@router.get("/{token}/download")
def download_shared_file(
    token: str,
    db: Session = Depends(get_db)
):
    file, error = get_shared_file_for_download(
        db=db,
        token=token
    )

    if error:
        raise HTTPException(
            status_code=403,
            detail=error
        )

    return FileResponse(
        path=file.storage_path,
        filename=file.original_filename,
        media_type=file.content_type
    )