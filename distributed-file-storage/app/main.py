from fastapi import FastAPI, Depends

from app.routes.auth import router as auth_router
from app.auth.dependencies import get_current_user

app = FastAPI(
    title="Distributed File Storage API",
    version="1.0.0",
    description="A production-ready distributed file storage system."
)

app.include_router(auth_router)


@app.get("/")
def root():
    return {
        "message": "Distributed File Storage API"
    }


@app.get("/me")
def me(
    current_user: str = Depends(get_current_user)
):
    return {
        "logged_in_user": current_user
    }