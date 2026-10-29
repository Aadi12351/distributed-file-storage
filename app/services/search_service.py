from sqlalchemy.orm import Session

from app.models.file import File
from app.models.folder import Folder


def search(
    db: Session,
    owner_id: int,
    query: str
):
    files = (
        db.query(File)
        .filter(
            File.owner_id == owner_id,
            File.original_filename.ilike(f"%{query}%")
        )
        .order_by(File.original_filename.asc())
        .all()
    )

    folders = (
        db.query(Folder)
        .filter(
            Folder.owner_id == owner_id,
            Folder.name.ilike(f"%{query}%")
        )
        .order_by(Folder.name.asc())
        .all()
    )

    return {
        "query": query,
        "files": files,
        "folders": folders
    }


def search_suggestions(
    db: Session,
    owner_id: int,
    query: str
):
    files = (
        db.query(File)
        .filter(
            File.owner_id == owner_id,
            File.original_filename.ilike(f"%{query}%")
        )
        .order_by(File.original_filename.asc())
        .limit(5)
        .all()
    )

    folders = (
        db.query(Folder)
        .filter(
            Folder.owner_id == owner_id,
            Folder.name.ilike(f"%{query}%")
        )
        .order_by(Folder.name.asc())
        .limit(5)
        .all()
    )

    suggestions = []

    for folder in folders:
        suggestions.append(
            {
                "id": folder.id,
                "name": folder.name,
                "type": "folder"
            }
        )

    for file in files:
        suggestions.append(
            {
                "id": file.id,
                "name": file.original_filename,
                "type": "file"
            }
        )

    suggestions.sort(key=lambda item: item["name"].lower())

    return {
        "query": query,
        "suggestions": suggestions[:5]
    }