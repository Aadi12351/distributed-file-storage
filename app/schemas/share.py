from datetime import datetime

from pydantic import BaseModel, field_validator


class ShareCreate(BaseModel):
    permission: str = "view"
    expires_at: datetime | None = None

    @field_validator("expires_at")
    @classmethod
    def expiry_timezone(cls, value):
        if value is not None and value.tzinfo is None:
            raise ValueError("Include a timezone in the expiration date")
        return value

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