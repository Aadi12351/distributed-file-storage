from sqlalchemy.orm import Session

from app.models.file import File


# ============================================================
# SUPPORTED PREVIEW TYPES
# ============================================================

PREVIEW_CONTENT_TYPES = {
    # PDF
    "application/pdf",

    # Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",

    # Text
    "text/plain",
    "text/csv",

    # Microsoft Office
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

    # Older Office formats
    "application/msword",
    "application/vnd.ms-excel",
}


# ============================================================
# GET FILE FOR PREVIEW
# ============================================================

def get_file_for_preview(
    db: Session,
    owner_id: int,
    file_id: int
):
    file = (
        db.query(File)
        .filter(
            File.id == file_id,
            File.owner_id == owner_id,
            File.is_deleted.is_(False)
        )
        .first()
    )

    if not file:
        return None, "File not found"

    if file.content_type not in PREVIEW_CONTENT_TYPES:
        return None, (
            f"Preview is not supported for file type: "
            f"{file.content_type}"
        )

    return file, None