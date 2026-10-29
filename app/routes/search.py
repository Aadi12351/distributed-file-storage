from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User

from app.schemas.search import SearchResponse
from app.services.search_service import search
from app.schemas.search_suggestion import SuggestionResponse

from app.services.search_service import (
    search,
    search_suggestions
)

router = APIRouter(
    prefix="/search",
    tags=["Search"]
)


@router.get(
    "",
    response_model=SearchResponse
)
def search_files_and_folders(
    q: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    return search(
        db=db,
        owner_id=current_user.id,
        query=q
    )
@router.get(
    "/suggestions",
    response_model=SuggestionResponse
)
def suggestions(
    q: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return search_suggestions(
        db=db,
        owner_id=current_user.id,
        query=q
    )