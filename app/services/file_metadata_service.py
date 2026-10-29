from pathlib import Path

from sqlalchemy.orm import Session

from app.models.file import File
from app.models.share import Share


# ============================================================
# FILE TYPE DETECTION
# ============================================================

FILE_TYPE_MAP = {

    # Documents
    ".pdf": "PDF Document",
    ".doc": "Word Document",
    ".docx": "Word Document",

    # Spreadsheets
    ".xls": "Excel Spreadsheet",
    ".xlsx": "Excel Spreadsheet",
    ".csv": "CSV Spreadsheet",

    # Presentations
    ".ppt": "PowerPoint Presentation",
    ".pptx": "PowerPoint Presentation",

    # Images
    ".jpg": "Image",
    ".jpeg": "Image",
    ".png": "Image",
    ".gif": "Image",
    ".webp": "Image",
    ".svg": "SVG Image",

    # Videos
    ".mp4": "Video",
    ".mkv": "Video",
    ".avi": "Video",
    ".mov": "Video",
    ".webm": "Video",

    # Audio
    ".mp3": "Audio",
    ".wav": "Audio",
    ".ogg": "Audio",
    ".m4a": "Audio",

    # Archives
    ".zip": "ZIP Archive",
    ".rar": "RAR Archive",
    ".7z": "7-Zip Archive",
    ".tar": "TAR Archive",
    ".gz": "GZIP Archive",

    # Code
    ".py": "Python File",
    ".js": "JavaScript File",
    ".jsx": "React File",
    ".html": "HTML File",
    ".css": "CSS File",
    ".json": "JSON File",
    ".xml": "XML File",
    ".sql": "SQL File",

    # Text
    ".txt": "Text File",
    ".md": "Markdown File",
}


# ============================================================
# FORMAT FILE SIZE
# ============================================================

def format_file_size(size: int) -> str:

    if size < 1024:
        return f"{size} B"

    if size < 1024 * 1024:
        return f"{size / 1024:.2f} KB"

    if size < 1024 * 1024 * 1024:
        return f"{size / (1024 * 1024):.2f} MB"

    return f"{size / (1024 * 1024 * 1024):.2f} GB"


# ============================================================
# GET FILE METADATA
# ============================================================

def get_file_metadata(
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
        return None

    # --------------------------------------------------------
    # Extension
    # --------------------------------------------------------

    extension = Path(
        file.original_filename
    ).suffix.lower()

    # --------------------------------------------------------
    # File type
    # --------------------------------------------------------

    file_type = FILE_TYPE_MAP.get(
        extension,
        "File"
    )

    # --------------------------------------------------------
    # Share information
    # --------------------------------------------------------

    share_count = (
        db.query(Share)
        .filter(
            Share.file_id == file.id,
            Share.owner_id == owner_id
        )
        .count()
    )

    is_shared = share_count > 0

    # --------------------------------------------------------
    # Response
    # --------------------------------------------------------

    return {
        "id": file.id,

        "name": file.original_filename,

        "extension": extension or None,

        "type": file_type,

        "mime_type": file.content_type,

        "size": file.file_size,

        "size_formatted": format_file_size(
            file.file_size
        ),

        "created_at": file.created_at,

        "folder_id": file.folder_id,

        "is_shared": is_shared,

        "share_count": share_count
    }