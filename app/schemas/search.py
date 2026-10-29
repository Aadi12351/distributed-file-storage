from pydantic import BaseModel
from datetime import datetime


class SearchFileResponse(BaseModel):
    id: int
    original_filename: str
    folder_id: int | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class SearchFolderResponse(BaseModel):
    id: int
    name: str
    parent_folder_id: int | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class SearchResponse(BaseModel):
    query: str
    files: list[SearchFileResponse]
    folders: list[SearchFolderResponse]