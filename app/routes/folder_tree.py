from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.dependencies import get_current_user

from app.models.user import User

from app.schemas.folder_tree import TreeFolder

from app.services.folder_tree_service import build_tree


router = APIRouter(
    prefix="/folders",
    tags=["Folder Tree"]
)


@router.get(
    "/{folder_id}/tree",
    response_model=TreeFolder
)
def folder_tree(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    tree = build_tree(
        db=db,
        owner_id=current_user.id,
        folder_id=folder_id
    )

    if tree is None:
        raise HTTPException(
            status_code=404,
            detail="Folder not found"
        )

    return tree