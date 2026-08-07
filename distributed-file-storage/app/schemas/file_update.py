from pydantic import BaseModel, Field


class FileRename(BaseModel):
    new_name: str = Field(
        ...,
        min_length=1,
        max_length=255
    )