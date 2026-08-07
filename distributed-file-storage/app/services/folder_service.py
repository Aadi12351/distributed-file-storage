from sqlalchemy.orm import Session

from app.models.folder import Folder

from app.models.file import File



def create_folder(
    db: Session,
    owner_id: int,
    name: str,
    parent_folder_id: int = None
):
    folder = Folder(
        owner_id=owner_id,
        name=name,
        parent_folder_id=parent_folder_id
    )

    db.add(folder)
    db.commit()
    db.refresh(folder)

    return folder


def get_user_folders(
    db: Session,
    owner_id: int
):
    return (
        db.query(Folder)
        .filter(Folder.owner_id == owner_id)
        .order_by(Folder.created_at.desc())
        .all()
    )
def rename_folder(
    db: Session,
    folder_id: int,
    owner_id: int,
    new_name: str
):
    folder = (
        db.query(Folder)
        .filter(
            Folder.id == folder_id,
            Folder.owner_id == owner_id
        )
        .first()
    )

    if folder is None:
        return None

    folder.name = new_name

    db.commit()
    db.refresh(folder)

    return folder
def delete_folder(
    db: Session,
    folder_id: int,
    owner_id: int
):
    folder = (
        db.query(Folder)
        .filter(
            Folder.id == folder_id,
            Folder.owner_id == owner_id
        )
        .first()
    )

    if folder is None:
        return None

    db.delete(folder)
    db.commit()

    return True

def move_folder(
    db: Session,
    folder_id: int,
    owner_id: int,
    parent_folder_id: int | None
):
    folder = (
        db.query(Folder)
        .filter(
            Folder.id == folder_id,
            Folder.owner_id == owner_id
        )
        .first()
    )

    if folder is None:
        return None

    # Verify parent folder exists (if provided)
    if parent_folder_id is not None:

        parent = (
            db.query(Folder)
            .filter(
                Folder.id == parent_folder_id,
                Folder.owner_id == owner_id
            )
            .first()
        )

        if parent is None:
            return False

    folder.parent_folder_id = parent_folder_id

    db.commit()
    db.refresh(folder)

    return folder
def get_folder_contents(
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

    if folder is None:
        return None

    folders = (
        db.query(Folder)
        .filter(
            Folder.parent_folder_id == folder_id,
            Folder.owner_id == owner_id
        )
        .order_by(Folder.name.asc())
        .all()
    )

    files = (
        db.query(File)
        .filter(
            File.folder_id == folder_id,
            File.owner_id == owner_id
        )
        .order_by(File.original_filename.asc())
        .all()
    )

    breadcrumb = []

    current = folder

    while current:

        breadcrumb.insert(
            0,
            {
                "id": current.id,
                "name": current.name
            }
        )

        current = current.parent

    return {
        "folder": folder,
        "breadcrumb": breadcrumb,
        "folders": folders,
        "files": files
    }