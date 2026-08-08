from datetime import datetime

from pydantic import BaseModel


class FileVersionResponse(BaseModel):

    id: int

    file_id: int

    version_number: int

    original_filename: str

    file_size: int

    content_type: str

    created_at: datetime

    class Config:
        from_attributes = True