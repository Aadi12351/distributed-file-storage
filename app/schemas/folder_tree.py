from pydantic import BaseModel
from datetime import datetime


class TreeFile(BaseModel):
    id: int
    original_filename: str
    file_size: int
    content_type: str

    class Config:
        from_attributes = True


class TreeFolder(BaseModel):
    id: int
    name: str
    created_at: datetime

    folders: list["TreeFolder"] = []
    files: list[TreeFile] = []

    class Config:
        from_attributes = True


TreeFolder.model_rebuild()