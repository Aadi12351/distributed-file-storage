from fastapi import FastAPI, Depends

# Database
from app.database.database import Base, engine

# Models
from app.models.user import User
from app.models.file import File
from app.models.folder import Folder

# Create all database tables
Base.metadata.create_all(bind=engine)

# Routers
from app.routes.auth import router as auth_router
from app.routes.file import router as file_router
from app.routes.folder import router as folder_router

# Dependencies
from app.auth.dependencies import get_current_user

#Search
from app.routes.search import router as search_router

from app.routes.folder_tree import router as folder_tree_router
from app.routes.trash import router as trash_router

#share
from app.routes.share import router as share_router

app = FastAPI(
    title="Distributed File Storage API",
    version="1.0.0",
    description="A production-ready distributed file storage system."
)

# Register routers
app.include_router(auth_router)
app.include_router(file_router)
app.include_router(folder_router)


@app.get("/")
def root():
    return {
        "message": "Distributed File Storage API"
    }


@app.get("/me")
def me(
    current_user: User = Depends(get_current_user)
):
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email
    }

app.include_router(search_router)
app.include_router(folder_tree_router)
app.include_router(trash_router)
app.include_router(share_router)