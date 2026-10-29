"""Private previews and scoped, expiring URLs for native streaming players."""
from datetime import datetime, timedelta, timezone
from pathlib import Path
import mimetypes
import zipfile
from html import escape
from xml.etree import ElementTree
from urllib.parse import quote
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, Response
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.auth.dependencies import get_current_user
from app.config.settings import settings
from app.database.session import get_db
from app.models.file import File
from app.models.preferences import AccountPreferences
from app.models.security import LoginSession
import time
from app.services.preview_renderer import render_docx, render_xlsx

router = APIRouter(prefix="/preview", tags=["Preview"])
LIMIT = 2 * 1024 * 1024
ENTRY_LIMIT = 20 * 1024 * 1024
HEADERS = {"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer"}

def owned(db, uid, fid):
    file = db.query(File).filter(File.id == fid, File.owner_id == uid, File.is_deleted.is_(False)).first()
    if not file or not Path(file.storage_path).is_file():
        raise HTTPException(404, "File not found")
    return file

def classify(name, mime):
    ext = Path(name).suffix.lower()
    guessed = mimetypes.guess_type(name)[0]
    mime = guessed or mime or "application/octet-stream"
    if ext == ".zip": return "archive", "application/zip"
    if ext == ".pdf": return "pdf", "application/pdf"
    if ext in (".docx", ".xlsx", ".pptx"): return "document", mime
    if mime.startswith("image/"): return "image", mime
    if mime.startswith("audio/"): return "audio", mime
    if mime.startswith("video/"): return "video", mime
    if mime.startswith("text/") or ext in (".json", ".xml", ".md", ".yaml", ".yml", ".js", ".jsx", ".ts", ".tsx", ".py", ".log", ".sql", ".ini", ".toml", ".sh", ".c", ".cpp", ".java", ".srt", ".vtt", ".ipynb"):
        return "text", "text/plain"
    return "binary", mime

def ticket(db, user, file):
    prefs = db.get(AccountPreferences, user.id)
    return jwt.encode({"scope": "preview", "sid": getattr(user, "preview_session_id", None), "uid": user.id, "fid": file.id, "ver": prefs.token_version if prefs else 0,
                       "exp": datetime.now(timezone.utc) + timedelta(hours=2)}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def authorized(db, fid, token):
    try:
        p = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if p.get("scope") != "preview" or p.get("fid") != fid or not isinstance(p.get("uid"), int):
            raise ValueError()
        prefs = db.get(AccountPreferences, p["uid"])
        if p.get("ver") != (prefs.token_version if prefs else 0): raise ValueError()
    except (JWTError, ValueError):
        raise HTTPException(401, "Preview link expired. Close and reopen the preview.")
    if p.get("sid"):
        session = db.get(LoginSession, p["sid"])
        if not session or session.owner_id != p["uid"] or session.revoked or session.expires_at <= time.time():
            raise HTTPException(401, "Preview session has ended. Sign in again.")
    return owned(db, p["uid"], fid)

def describe(name, mime, size, raw):
    kind, mime = classify(name, mime)
    result = {"name": name, "kind": kind, "mime": mime, "size": size}
    if kind == "text":
        text = raw.decode("utf-16" if raw.startswith((b"\xff\xfe", b"\xfe\xff")) else "utf-8-sig", errors="replace")
        result.update(text=text, truncated=size > len(raw))
    result.update(hex="\n".join(f"{i:08x}  {' '.join(f'{b:02x}' for b in raw[i:i+16]):47}  {''.join(chr(b) if 32 <= b < 127 else '.' for b in raw[i:i+16])}" for i in range(0, min(len(raw), 4096), 16)))
    if kind == "binary": result["truncated"] = size > 4096
    return result

@router.get("/{fid}/info")
def info(fid: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    file = owned(db, user.id, fid)
    with open(file.storage_path, "rb") as stream: raw = stream.read(LIMIT)
    result = describe(file.original_filename, file.content_type, Path(file.storage_path).stat().st_size, raw)
    result["token"] = ticket(db, user, file)
    if result["kind"] == "archive":
        try:
            with zipfile.ZipFile(file.storage_path) as z:
                result["entries"] = [{"index": i, "name": e.filename, "size": e.file_size, "directory": e.is_dir(), "encrypted": bool(e.flag_bits & 1)} for i, e in enumerate(z.infolist()[:5000])]
                result["truncated"] = len(z.infolist()) > 5000
        except (zipfile.BadZipFile, OSError): result.update(kind="binary", error="This ZIP is damaged or uses an unsupported archive format.")
    return result

def archive_entry(file, index):
    try:
        with zipfile.ZipFile(file.storage_path) as z:
            entries = z.infolist()
            if index < 0 or index >= min(len(entries), 5000): raise HTTPException(404, "Entry not found")
            e = entries[index]
            if e.is_dir(): raise HTTPException(400, "Select a file inside this folder")
            if e.flag_bits & 1: raise HTTPException(422, "Encrypted entries must be opened in an archive app with their password")
            if e.file_size > ENTRY_LIMIT or e.file_size / max(e.compress_size, 1) > 1000:
                raise HTTPException(413, "This entry exceeds the safe preview limit. Download the original archive to open it locally.")
            with z.open(e) as stream: raw = stream.read(ENTRY_LIMIT + 1)
            if len(raw) > ENTRY_LIMIT: raise HTTPException(413, "Archive entry is too large")
            return e, raw
    except (zipfile.BadZipFile, RuntimeError, NotImplementedError, OSError):
        raise HTTPException(422, "This archive entry cannot be decoded")

@router.get("/{fid}/entry/{index}/info")
def entry_info(fid: int, index: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    file = owned(db, user.id, fid)
    e, raw = archive_entry(file, index)
    return describe(e.filename, None, len(raw), raw[:LIMIT])

@router.get("/{fid}/content")
def content(fid: int, token: str = Query(...), entry: int | None = None, download: bool = False, db: Session = Depends(get_db)):
    file = authorized(db, fid, token)
    if entry is not None:
        e, raw = archive_entry(file, entry)
        kind, mime = classify(e.filename, None)
        # Never execute HTML, SVG, scripts or active office documents from an archive.
        if kind not in ("image", "audio", "video", "pdf") or mime == "image/svg+xml": mime = "text/plain" if kind == "text" else "application/octet-stream"
        headers = {**HEADERS, "Content-Disposition": ("attachment" if download else "inline") + "; filename*=UTF-8''" + quote(Path(e.filename).name), "Content-Security-Policy": "sandbox"}
        return Response(raw, media_type=mime, headers=headers)
    kind, mime = classify(file.original_filename, file.content_type)
    if kind == "document" and not download:
        if Path(file.storage_path).stat().st_size > ENTRY_LIMIT: raise HTTPException(413, "Document is too large to render. Download it to open locally.")
        try:
            with zipfile.ZipFile(file.storage_path) as z:
                if sum(e.file_size for e in z.infolist()) > 50 * 1024 * 1024: raise HTTPException(413, "Expanded document exceeds the preview limit")
            ext = Path(file.original_filename).suffix.lower()
            if ext == ".xlsx": html = render_xlsx(file.storage_path)
            elif ext == ".docx": html = render_docx(file.storage_path)
            else:
                with zipfile.ZipFile(file.storage_path) as z:
                    names = sorted((n for n in z.namelist() if n.startswith("ppt/slides/slide") and n.endswith(".xml")), key=lambda n: int(Path(n).stem[5:]))[:200]
                    slides = ["<section><h2>Slide " + str(i+1) + "</h2>" + "".join("<p>" + escape(t.text or "") + "</p>" for t in ElementTree.fromstring(z.read(n)).iter() if t.tag.endswith("}t")) + "</section>" for i,n in enumerate(names)]
                html = '<style>body{font:18px system-ui;background:#eef2f6;padding:24px}section{background:white;padding:48px;margin:0 auto 24px;max-width:900px;min-height:400px;box-shadow:0 4px 20px #0001}</style>' + ''.join(slides)
            return Response(html, media_type="text/html", headers={**HEADERS, "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'"})
        except HTTPException: raise
        except Exception: raise HTTPException(422, "Document is damaged, encrypted, or cannot be rendered. Download it to open in its original app.")
    if kind in ("text", "binary", "archive"): mime = "application/octet-stream" if download else "text/plain"
    return FileResponse(file.storage_path, media_type=mime, filename=file.original_filename, content_disposition_type="attachment" if download else "inline", headers={**HEADERS, "Content-Security-Policy": "sandbox"})
