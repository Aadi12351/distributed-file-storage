from datetime import datetime
from pydantic import BaseModel


class FileMetadataResponse(BaseModel):
    id: int

    name: str
    extension: str | None

    type: str
    mime_type: str

    size: int
    size_formatted: str

    created_at: datetime

    folder_id: int | None

    is_shared: bool
    share_count: int