from pydantic import BaseModel
from datetime import datetime


# -----------------------------
# Create Folder Request
# -----------------------------
class FolderCreate(BaseModel):
    name: str
    parent_folder_id: int | None = None


# -----------------------------
# Folder Response
# -----------------------------
class FolderResponse(BaseModel):
    id: int
    owner_id: int
    name: str
    parent_folder_id: int | None = None
    created_at: datetime

    class Config:
        from_attributes = True


# -----------------------------
# Folder Item
# -----------------------------
class FolderItem(BaseModel):
    id: int
    name: str
    parent_folder_id: int | None = None
    created_at: datetime

    class Config:
        from_attributes = True


# -----------------------------
# File Item
# -----------------------------
class FileItem(BaseModel):
    id: int
    original_filename: str
    file_size: int
    content_type: str
    created_at: datetime

    class Config:
        from_attributes = True


# -----------------------------
# Breadcrumb Item
# -----------------------------
class BreadcrumbItem(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


# -----------------------------
# Folder Contents Response
# -----------------------------
class FolderContentsResponse(BaseModel):
    folder: FolderItem
    breadcrumb: list[BreadcrumbItem]
    folders: list[FolderItem]
    files: list[FileItem]