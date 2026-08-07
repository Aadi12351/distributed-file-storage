from pydantic import BaseModel


class MoveFileRequest(BaseModel):
    folder: str