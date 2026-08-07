from typing import Optional
from pydantic import BaseModel

class MoveFileRequest(BaseModel):
    folder_id: Optional[int] = None