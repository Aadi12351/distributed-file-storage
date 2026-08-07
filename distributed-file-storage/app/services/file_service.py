import os
import shutil
import uuid

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.models.file import File
from fastapi import HTTPException

from sqlalchemy.orm import Session
from app.models.file import File



UPLOAD_DIRECTORY = "uploads"

os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)


def upload_file(
    db: Session,
    file: UploadFile,
    owner_id: int
):
    # Generate unique filename
    extension = os.path.splitext(file.filename)[1]

    stored_filename = f"{uuid.uuid4()}{extension}"

    storage_path = os.path.join(
        UPLOAD_DIRECTORY,
        stored_filename
    )

    # Save file
    with open(storage_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(storage_path)

    new_file = File(
        owner_id=owner_id,
        original_filename=file.filename,
        stored_filename=stored_filename,
        storage_path=storage_path,
        file_size=file_size,
        content_type=file.content_type
    )

    db.add(new_file)
    db.commit()
    db.refresh(new_file)

    return new_file


def get_user_files(
    db: Session,
    owner_id: int
):
    return (
        db.query(File)
        .filter(File.owner_id == owner_id)
        .order_by(File.created_at.desc())
        .all()
    )
def get_file_by_id(
    db: Session,
    file_id: int,
    owner_id: int
):
    file = (
        db.query(File)
        .filter(
            File.id == file_id,
            File.owner_id == owner_id
        )
        .first()
    )

    if file is None:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    return file
def delete_file(
    db: Session,
    file_id: int,
    owner_id: int
):
    file = (
        db.query(File)
        .filter(
            File.id == file_id,
            File.owner_id == owner_id
        )
        .first()
    )

    if file is None:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    if os.path.exists(file.storage_path):
        os.remove(file.storage_path)

    db.delete(file)
    db.commit()

    return {
        "message": "File deleted successfully"
    }
def rename_file(
    db: Session,
    file_id: int,
    owner_id: int,
    new_name: str
):
    file = (
        db.query(File)
        .filter(
            File.id == file_id,
            File.owner_id == owner_id
        )
        .first()
    )

    if file is None:
        return None

    import os

    extension = os.path.splitext(file.original_filename)[1]

    if not new_name.endswith(extension):
        new_name += extension

    file.original_filename = new_name

    db.commit()
    db.refresh(file)

    return file
def get_file_details(
    db: Session,
    file_id: int,
    owner_id: int
):
    file = (
        db.query(File)
        .filter(
            File.id == file_id,
            File.owner_id == owner_id
        )
        .first()
    )

    return file
def move_file(
    db: Session,
    file_id: int,
    owner_id: int,
    folder: str
):
    file = (
        db.query(File)
        .filter(
            File.id == file_id,
            File.owner_id == owner_id
        )
        .first()
    )

    if file is None:
        return None

    file.folder = folder

    db.commit()
    db.refresh(file)

    return file