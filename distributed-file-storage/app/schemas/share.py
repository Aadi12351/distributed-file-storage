from datetime import datetime

from pydantic import BaseModel, field_validator


class ShareCreate(BaseModel):
    permission: str = "view"
    expires_at: datetime | None = None

    @field_validator("permission")
    @classmethod
    def validate_permission(cls, value: str):
        allowed = {
            "view",
            "download",
            "edit"
        }

        if value not in allowed:
            raise ValueError(
                "Permission must be view, download, or edit"
            )

        return value