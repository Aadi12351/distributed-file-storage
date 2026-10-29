from sqlalchemy.orm import Session
from app.auth.hashing import verify_password
from app.models.user import User
from app.auth.hashing import hash_password

DUMMY_HASH = hash_password("not-an-account-password")


def register_user(db: Session, full_name: str, email: str, password: str):

    email = email.strip().lower()
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

    email = email.strip().lower()
    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:
        verify_password(password[:128], DUMMY_HASH)
        return None

    if not verify_password(password, user.password):
        return None

    return user