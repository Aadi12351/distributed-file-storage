from fastapi import HTTPException
from app.config.settings import settings


def check_upload(upload):
    position = upload.file.tell()
    upload.file.seek(0, 2)
    size = upload.file.tell()
    upload.file.seek(position)
    if size > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(413, f"File exceeds the {settings.MAX_UPLOAD_MB} MB upload limit")
