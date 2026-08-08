import secrets

from sqlalchemy.orm import Session

from app.models.file import File
from app.models.share import Share


def create_file_share(
    db: Session,
    owner_id: int,
    file_id: int
):
    # Make sure the file belongs to the current user
    # and is not in trash.
    file = (
        db.query(File)
        .filter(
            File.id == file_id,
            File.owner_id == owner_id,
            File.is_deleted.is_(False)
        )
        .first()
    )

    if not file:
        return None

    # Generate a secure random token.
    token = secrets.token_urlsafe(32)

    share = Share(
        owner_id=owner_id,
        file_id=file.id,
        folder_id=None,
        token=token,
        permission="view"
    )

    db.add(share)
    db.commit()
    db.refresh(share)

    return share