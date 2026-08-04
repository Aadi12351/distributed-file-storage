from sqlalchemy.orm import Session
from app.auth.hashing import verify_password
from app.models.user import User
from app.auth.hashing import hash_password


def register_user(db: Session, full_name: str, email: str, password: str):

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:
        return None

    hashed_password = hash_password(password)

    new_user = User(
        full_name=full_name,
        email=email,
        password=hashed_password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user
def login_user(db: Session, email: str, password: str):

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:
        return None

    if not verify_password(password, user.password):
        return None

    return user