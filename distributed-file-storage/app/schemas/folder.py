from pydantic import BaseModel
from datetime import datetime


class FolderCreate(BaseModel):
    name: str
    parent_folder_id: int | None = None


class FolderResponse(BaseModel):
    id: int
    name: str
    owner_id: int
    parent_folder_id: int | None
    created_at: datetime

    class Config:
        from_attributes = True