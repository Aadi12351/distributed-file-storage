from pydantic import BaseModel


class MoveFolderRequest(BaseModel):
    parent_folder_id: int | None = None