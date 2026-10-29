from app.database.database import Base, engine

# Import models
from app.models.user import User

print("Creating database tables...")
from app.models.user import User
from app.models.file import File
from app.models.folder import Folder
from app.models.share import Share
from app.models.file_version import FileVersion
Base.metadata.create_all(bind=engine)

print("Database initialized successfully!")