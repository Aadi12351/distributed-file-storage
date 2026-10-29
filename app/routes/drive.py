"""Owner-scoped Drive operations. Folder mutations include their descendants."""
from datetime import date, datetime, timezone
from pathlib import Path
import shutil
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import Column, Integer, String, Boolean, UniqueConstraint
from sqlalchemy.orm import Session
from app.database.database import Base
from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.models.file import File
from app.models.folder import Folder
from app.models.share import Share
from app.models.preferences import ItemMetadata, touch_item
from app.services.advanced_search import matches_type, contains_words


class Favorite(Base):
    __tablename__ = "drive_favorites"
    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, nullable=False)
    kind = Column(String(10), nullable=False)
    item_id = Column(Integer, nullable=False)
    starred = Column(Boolean, default=True)
    __table_args__ = (UniqueConstraint("owner_id", "kind", "item_id"),)


router = APIRouter(prefix="/drive", tags=["Drive"])


class Mutation(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    parent_id: int | None = None
    starred: bool = True


def owned(db, owner, kind, item_id, deleted=False):
    model = {"file": File, "folder": Folder}.get(kind)
    if model is None:
        raise HTTPException(400, "Invalid item type")
    item = db.query(model).filter(model.id == item_id, model.owner_id == owner).first()
    if item is None or (item.is_deleted and not deleted):
        raise HTTPException(404, "Item not found")
    return item


def destination(db, owner, parent_id, source=None):
    if parent_id is None:
        return
    parent = owned(db, owner, "folder", parent_id)
    visited = set()
    while parent:
        if parent.id == source or parent.id in visited:
            raise HTTPException(400, "A folder cannot be placed inside itself or its descendants")
        visited.add(parent.id)
        parent = owned(db, owner, "folder", parent.parent_folder_id) if parent.parent_folder_id else None


def descendants(db, owner, folder):
    result, pending, seen = [], [folder], set()
    while pending:
        node = pending.pop()
        if node.id in seen:
            raise HTTPException(400, "Invalid folder cycle")
        seen.add(node.id)
        result.append(node)
        pending.extend(db.query(Folder).filter(Folder.owner_id == owner, Folder.parent_folder_id == node.id).all())
    return result


def serialize(item, kind, stars):
    return dict(id=item.id, kind=kind, name=item.name if kind == "folder" else item.original_filename,
                parent_id=item.parent_folder_id if kind == "folder" else item.folder_id,
                size=0 if kind == "folder" else item.file_size,
                content_type="folder" if kind == "folder" else item.content_type,
                created_at=item.created_at, deleted_at=item.deleted_at,
                starred=(kind, item.id) in stars)


@router.get("/items")
def items(view: str = "drive", parent_id: int | None = None, q: str = "",
          advanced: bool = False, file_type: str = "any", content_q: str = "",
          location_id: int | None = None, starred_only: bool = False,
          modified_after: date | None = None, modified_before: date | None = None,
          db: Session = Depends(get_db), user=Depends(get_current_user)):
    if view not in {"drive", "home", "recent", "starred", "trash", "shared", "storage"}:
        raise HTTPException(400, "Unknown view")
    if parent_id is not None:
        destination(db, user.id, parent_id)
    if file_type not in {"any", "folders", "documents", "spreadsheets", "pdfs", "images", "videos", "audio", "archives"}:
        raise HTTPException(400, "Invalid file type")
    if modified_after and modified_before and modified_after > modified_before:
        raise HTTPException(400, "Start date must be before end date")
    location_ids = None
    if location_id is not None:
        location = owned(db, user.id, "folder", location_id, deleted=view == "trash")
        location_ids = {node.id for node in descendants(db, user.id, location)}
    modified = {(m.kind, m.item_id): m.modified_at for m in db.query(ItemMetadata).filter_by(owner_id=user.id).all()}
    stars = {(s.kind, s.item_id) for s in db.query(Favorite).filter_by(owner_id=user.id, starred=True).all()}
    shared_ids = {s.file_id for s in db.query(Share).filter_by(owner_id=user.id).all()}
    rows = []
    for kind, model in [("folder", Folder), ("file", File)]:
        for item in db.query(model).filter_by(owner_id=user.id, is_deleted=view == "trash").all():
            row = serialize(item, kind, stars)
            changed = modified.get((kind, item.id), item.created_at)
            row["modified_at"] = changed
            if not matches_type(item, kind, file_type):
                continue
            if content_q and (kind == "folder" or not contains_words(item, content_q)):
                continue
            if location_ids is not None and row["parent_id"] not in location_ids:
                continue
            if starred_only and not row["starred"]:
                continue
            if modified_after and changed.date() < modified_after:
                continue
            if modified_before and changed.date() > modified_before:
                continue
            if q and q.casefold() not in row["name"].casefold():
                continue
            if view == "drive" and not q and not advanced and row["parent_id"] != parent_id:
                continue
            if view == "starred" and not row["starred"]:
                continue
            if view == "shared" and (kind != "file" or item.id not in shared_ids):
                continue
            if view in {"recent", "storage"} and kind != "file":
                continue
            rows.append(row)
    folders = db.query(Folder).filter_by(owner_id=user.id, is_deleted=False).all()
    breadcrumb = []
    current = owned(db, user.id, "folder", parent_id) if parent_id else None
    seen = set()
    while current and current.id not in seen:
        seen.add(current.id)
        breadcrumb.insert(0, {"id": current.id, "name": current.name})
        current = owned(db, user.id, "folder", current.parent_folder_id) if current.parent_folder_id else None
    used = sum(f.file_size for f in db.query(File).filter_by(owner_id=user.id).all())
    return {"items": rows, "folders": [{"id": f.id, "name": f.name, "parent_id": f.parent_folder_id} for f in folders],
            "breadcrumb": breadcrumb, "used_bytes": used}


@router.post("/folders")
def create(data: Mutation, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if not data.name or not data.name.strip():
        raise HTTPException(400, "Enter a folder name")
    destination(db, user.id, data.parent_id)
    folder = Folder(name=data.name.strip(), owner_id=user.id, parent_folder_id=data.parent_id)
    db.add(folder)
    db.commit()
    return {"id": folder.id}


@router.post("/{kind}/{item_id}/{action}")
def mutate(kind: str, item_id: int, action: str, data: Mutation,
           db: Session = Depends(get_db), user=Depends(get_current_user)):
    item = owned(db, user.id, kind, item_id, deleted=action in {"restore", "delete"})
    if action in {"copy", "move"}:
        destination(db, user.id, data.parent_id, item.id if kind == "folder" else None)
    if action == "rename":
        if not data.name or not data.name.strip():
            raise HTTPException(400, "Enter a name")
        setattr(item, "name" if kind == "folder" else "original_filename", data.name.strip())
    elif action == "move":
        setattr(item, "parent_folder_id" if kind == "folder" else "folder_id", data.parent_id)
    elif action == "star":
        star = db.query(Favorite).filter_by(owner_id=user.id, kind=kind, item_id=item.id).first()
        if star is None:
            star = Favorite(owner_id=user.id, kind=kind, item_id=item.id)
            db.add(star)
        star.starred = data.starred
    elif action == "copy":
        paths = []
        def copy_file(source, parent, name=None):
            stored = str(uuid.uuid4()) + Path(source.original_filename).suffix
            path = Path("uploads") / stored
            shutil.copyfile(source.storage_path, path)
            paths.append(path)
            db.add(File(owner_id=user.id, original_filename=name or source.original_filename,
                        stored_filename=stored, storage_path=str(path), file_size=source.file_size,
                        content_type=source.content_type, folder_id=parent))
        try:
            if kind == "file":
                copy_file(item, data.parent_id, data.name or "Copy of " + item.original_filename)
            else:
                nodes = descendants(db, user.id, item)
                mapping = {}
                # descendants returns parents before children.
                for node in nodes:
                    if node.is_deleted:
                        continue
                    clone = Folder(owner_id=user.id, name=(data.name or "Copy of " + node.name) if node.id == item.id else node.name,
                                   parent_folder_id=data.parent_id if node.id == item.id else mapping.get(node.parent_folder_id))
                    db.add(clone)
                    db.flush()
                    mapping[node.id] = clone.id
                    for file in db.query(File).filter_by(owner_id=user.id, folder_id=node.id, is_deleted=False).all():
                        copy_file(file, clone.id)
            db.commit()
        except Exception:
            db.rollback()
            for path in paths:
                path.unlink(missing_ok=True)
            raise
        return {"message": "Copied"}
    elif action in {"trash", "restore", "delete"}:
        if action == "delete" and not item.is_deleted:
            raise HTTPException(400, "Move this item to trash before permanently deleting it")
        nodes = descendants(db, user.id, item) if kind == "folder" else []
        affected = list(nodes)
        if kind == "file":
            affected.append(item)
        else:
            affected.extend(db.query(File).filter(File.owner_id == user.id, File.folder_id.in_([n.id for n in nodes])).all())
        if action == "restore":
            parent_id = item.parent_folder_id if kind == "folder" else item.folder_id
            parent = db.query(Folder).filter_by(id=parent_id, owner_id=user.id).first() if parent_id else None
            if parent is None or parent.is_deleted:
                setattr(item, "parent_folder_id" if kind == "folder" else "folder_id", None)
        batch_deleted_at = item.deleted_at
        trash_time = datetime.now(timezone.utc)
        for node in reversed(affected):
            if action == "delete":
                if isinstance(node, File):
                    db.query(Share).filter_by(file_id=node.id).delete()
                    for version in node.versions:
                        Path(version.storage_path).unlink(missing_ok=True)
                    Path(node.storage_path).unlink(missing_ok=True)
                db.query(Favorite).filter_by(owner_id=user.id, kind="file" if isinstance(node, File) else "folder", item_id=node.id).delete()
                db.delete(node)
            else:
                # Preserve independently trashed descendants when restoring a folder.
                if action == "trash" and node.is_deleted:
                    continue
                if action == "restore" and (not node.is_deleted or node.deleted_at != batch_deleted_at):
                    continue
                node.is_deleted = action == "trash"
                node.deleted_at = trash_time if node.is_deleted else None
    else:
        raise HTTPException(400, "Unknown action")
    if action in {"rename", "move", "restore"}:
        touch_item(db, user.id, kind, item.id)
    db.commit()
    return {"message": "Updated"}
