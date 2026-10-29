from pydantic import BaseModel


class FolderRename(BaseModel):
    new_name: str