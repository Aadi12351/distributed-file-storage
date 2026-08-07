from sqlalchemy.orm import Session

from app.models.folder import Folder
from app.models.file import File


def build_tree(
    db: Session,
    owner_id: int,
    folder_id: int
):

    folder = (
        db.query(Folder)
        .filter(
            Folder.id == folder_id,
            Folder.owner_id == owner_id
        )
        .first()
    )

    if not folder:
        return None

    return build_node(db, owner_id, folder)


def build_node(
    db: Session,
    owner_id: int,
    folder: Folder
):

    child_folders = (
        db.query(Folder)
        .filter(
            Folder.owner_id == owner_id,
            Folder.parent_folder_id == folder.id
        )
        .order_by(Folder.name)
        .all()
    )

    files = (
        db.query(File)
        .filter(
            File.owner_id == owner_id,
            File.folder_id == folder.id
        )
        .order_by(File.original_filename)
        .all()
    )

    return {
        "id": folder.id,
        "name": folder.name,
        "created_at": folder.created_at,
        "folders": [
            build_node(db, owner_id, child)
            for child in child_folders
        ],
        "files": files
    }