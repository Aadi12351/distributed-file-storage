from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from app.request_limits import RequestLimits
from app.config.settings import settings

from app.routes.security import router as security_router
from app.routes.preview import router as preview_router
from app.routes.drive import router as drive_router
from app.routes.account import router as account_router, profile
from app.database.session import get_db
from sqlalchemy.orm import Session

# Database
from app.database.database import Base, engine

# Models
from app.models.user import User
from app.models.file import File
from app.models.folder import Folder
from app.models.file_version import FileVersion

# Dependencies
from app.auth.dependencies import get_current_user

# Routers
from app.routes.auth import router as auth_router
from app.routes.file import router as file_router
from app.routes.folder import router as folder_router
from app.routes.search import router as search_router
from app.routes.folder_tree import router as folder_tree_router
from app.routes.trash import router as trash_router
from app.routes.share import router as share_router
from app.routes.dashboard import router as dashboard_router


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

print("Creating database tables...")

Base.metadata.create_all(bind=engine)

print("Database initialized successfully!")


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="Distributed File Storage API",
    version="1.0.0",
    description="Private file storage with Drive-style browsing and account protection.",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Accept-Ranges", "Content-Range", "Content-Length"],
)


# ============================================================
# ROUTERS
# ============================================================

app.add_middleware(RequestLimits)
app.include_router(security_router)
app.include_router(preview_router)
app.include_router(account_router)
app.include_router(drive_router)
app.include_router(auth_router)
app.include_router(file_router)
app.include_router(folder_router)
app.include_router(search_router)
app.include_router(folder_tree_router)
app.include_router(trash_router)
app.include_router(share_router)
app.include_router(dashboard_router)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "message": "Distributed File Storage API"
    }


# ============================================================
# CURRENT USER
# ============================================================

@app.get("/me")
def me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return profile(db, current_user)


@app.middleware("http")
async def private_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Cache-Control"] = "private, no-store"
    response.headers.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'self'")
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000"
    return response
