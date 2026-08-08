import secrets

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.share import Share
from app.models.file import File


ALLOWED_PERMISSIONS = {
    "view",
    "download",
    "edit",
}


def create_file_share(
    db: Session,
    owner_id: int,
    file_id: int,
    permission: str = "view",
    expires_at=None
):
    # Validate permission
    if permission not in ALLOWED_PERMISSIONS:
        return None, "Invalid permission"

    # Validate expiration
    if expires_at is not None:
        now = datetime.now(timezone.utc)

        if expires_at <= now:
            return None, "Expiration time must be in the future"

    # Find file belonging to current user
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
        return None, "File not found"

    # Generate unique public token
    token = secrets.token_urlsafe(32)

    share = Share(
        owner_id=owner_id,
        file_id=file_id,
        folder_id=None,
        token=token,
        permission=permission,
        expires_at=expires_at,
        password_hash=None
    )

    db.add(share)
    db.commit()
    db.refresh(share)

    return share, None


def get_shared_file(
    db: Session,
    token: str
):
    share = (
        db.query(Share)
        .filter(
            Share.token == token
        )
        .first()
    )

    if not share:
        return None, "Share link not found"

    # Check expiry
    if share.expires_at is not None:
        now = datetime.now(timezone.utc)

        if share.expires_at <= now:
            return None, "Share link has expired"

    # Currently supports file shares
    if share.file_id is None:
        return None, "This share does not contain a file"

    # Check file
    file = (
        db.query(File)
        .filter(
            File.id == share.file_id,
            File.is_deleted.is_(False)
        )
        .first()
    )

    if not file:
        return None, "File not found"

    return {
        "file_id": file.id,
        "filename": file.original_filename,
        "file_size": file.file_size,
        "content_type": file.content_type,
        "permission": share.permission,
        "created_at": share.created_at,
        "expires_at": share.expires_at
    }, None


def get_shared_file_for_download(
    db: Session,
    token: str
):
    share = (
        db.query(Share)
        .filter(
            Share.token == token
        )
        .first()
    )

    if not share:
        return None, "Share link not found"

    # Check expiry
    if share.expires_at is not None:
        now = datetime.now(timezone.utc)

        if share.expires_at <= now:
            return None, "Share link has expired"

    # Currently supports file shares
    if share.file_id is None:
        return None, "This share does not contain a file"

    # IMPORTANT:
    # view permission cannot download
    if share.permission == "view":
        return None, "Download permission required"

    # Check file
    file = (
        db.query(File)
        .filter(
            File.id == share.file_id,
            File.is_deleted.is_(False)
        )
        .first()
    )

    if not file:
        return None, "File not found"

    return file, None


def list_my_shares(
    db: Session,
    owner_id: int
):
    shares = (
        db.query(Share)
        .filter(
            Share.owner_id == owner_id
        )
        .order_by(
            Share.created_at.desc()
        )
        .all()
    )

    return [
        {
            "share_id": share.id,
            "file_id": share.file_id,
            "folder_id": share.folder_id,
            "token": share.token,
            "permission": share.permission,
            "expires_at": share.expires_at,
            "created_at": share.created_at
        }
        for share in shares
    ]


def revoke_share(
    db: Session,
    owner_id: int,
    share_id: int
):
    share = (
        db.query(Share)
        .filter(
            Share.id == share_id,
            Share.owner_id == owner_id
        )
        .first()
    )

    if not share:
        return None

    db.delete(share)
    db.commit()

    return share