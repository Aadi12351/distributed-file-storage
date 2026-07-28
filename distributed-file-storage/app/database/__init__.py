from app.database.database import Base, engine

# Import models
from app.models.user import User

print("Creating database tables...")

Base.metadata.create_all(bind=engine)

print("Database initialized successfully!")