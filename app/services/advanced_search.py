"""Search only files belonging to the authenticated user."""
from pathlib import Path
from zipfile import ZipFile, BadZipFile
from xml.etree import ElementTree


def matches_type(item, kind, file_type):
    if file_type == "any":
        return True
    if kind == "folder":
        return file_type == "folders"
    mime, ext = (item.content_type or "").lower(), Path(item.original_filename).suffix.lower()
    tests = {"images": mime.startswith("image/"), "videos": mime.startswith("video/"),
             "audio": mime.startswith("audio/"), "pdfs": mime == "application/pdf" or ext == ".pdf",
             "documents": ext in {".doc", ".docx", ".odt", ".txt", ".md", ".rtf"},
             "spreadsheets": ext in {".xls", ".xlsx", ".ods", ".csv"},
             "archives": ext in {".zip", ".rar", ".7z", ".tar", ".gz"}}
    return tests.get(file_type, False)


def contains_words(item, query):
    if not query:
        return True
    path = Path(item.storage_path)
    suffix = Path(item.original_filename).suffix.lower()
    try:
        if (item.content_type or "").startswith("text/") or suffix in {".txt", ".csv", ".md", ".json", ".log"}:
            with path.open("r", encoding="utf-8", errors="replace") as handle:
                text = handle.read(2 * 1024 * 1024)
        elif suffix in {".docx", ".xlsx"} and item.file_size <= 10 * 1024 * 1024:
            # Bound expanded XML size before reading compressed Office files.
            with ZipFile(path) as archive:
                entries = [entry for entry in archive.infolist() if entry.filename == "word/document.xml" or
                           entry.filename == "xl/sharedStrings.xml" or entry.filename.startswith("xl/worksheets/sheet")]
                if sum(entry.file_size for entry in entries) > 10 * 1024 * 1024:
                    return False
                text = " ".join(" ".join(ElementTree.fromstring(archive.read(entry)).itertext()) for entry in entries)
        else:
            return False
    except (OSError, BadZipFile, ElementTree.ParseError):
        return False
    return all(word in text.casefold() for word in query.casefold().split())
