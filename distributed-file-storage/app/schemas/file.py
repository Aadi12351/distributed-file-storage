from pydantic import BaseModel
from datetime import datetime


class FileResponse(BaseModel):
    id: int
    original_filename: str
    stored_filename: str
    file_size: int
    content_type: str
    folder: str
    created_at: datetime

    class Config:
        from_attributes = True


class FileDetailResponse(BaseModel):
    id: int
    owner_id: int
    original_filename: str
    stored_filename: str
    storage_path: str
    file_size: int
    content_type: str
    folder: str
    created_at: datetime

    class Config:
        from_attributes = True