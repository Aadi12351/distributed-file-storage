import os
import shutil
import uuid
from app.services.upload_limits import check_upload

from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session

from app.models.file import File
from app.models.folder import Folder

UPLOAD_DIRECTORY = "uploads"

os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)


def upload_file(
    db: Session,
    file: UploadFile,
    owner_id: int,
    folder_id: int | None = None
):
    check_upload(file)
    # Verify folder exists (if provided)
    if folder_id is not None:
        folder = (
            db.query(Folder)
            .filter(
                Folder.id == folder_id,
                Folder.owner_id == owner_id,
                Folder.is_deleted.is_(False)
            )
            .first()
        )

        if folder is None:
            raise HTTPException(
                status_code=404,
                detail="Folder not found"
            )

    filename = (file.filename or "Untitled").replace("\\", "/").split("/")[-1].replace("\r", "").replace("\n", "")
    if not filename.strip() or len(filename) > 255:
        raise HTTPException(400, "Invalid filename")
    extension = os.path.splitext(filename)[1]

    stored_filename = f"{uuid.uuid4()}{extension}"

    storage_path = os.path.join(
        UPLOAD_DIRECTORY,
        stored_filename
    )

    with open(storage_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(storage_path)

    new_file = File(
        owner_id=owner_id,
        original_filename=filename,
        stored_filename=stored_filename,
        storage_path=storage_path,
        file_size=file_size,
        content_type=file.content_type or "application/octet-stream",
        folder_id=folder_id
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
        .filter(
            File.owner_id == owner_id,
            File.is_deleted.is_(False)
        )
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
            File.owner_id == owner_id,
            File.is_deleted.is_(False)
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
            File.owner_id == owner_id,
            File.is_deleted.is_(False)
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
            File.owner_id == owner_id,
            File.is_deleted.is_(False)
        )
        .first()
    )

    if file is None:
        return None

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
            File.owner_id == owner_id,
            File.is_deleted.is_(False)
        )
        .first()
    )

    return file


def move_file(
    db: Session,
    file_id: int,
    owner_id: int,
    folder_id: int | None
):
    file = (
        db.query(File)
        .filter(
            File.id == file_id,
            File.owner_id == owner_id,
            File.is_deleted.is_(False)
        )
        .first()
    )

    if file is None:
        return None

    if folder_id is not None:
        folder = (
            db.query(Folder)
            .filter(
                Folder.id == folder_id,
                Folder.owner_id == owner_id,
                Folder.is_deleted.is_(False)
            )
            .first()
        )

        if folder is None:
            raise HTTPException(404, "Destination folder not found")

    file.folder_id = folder_id

    db.commit()
    db.refresh(file)

    return file