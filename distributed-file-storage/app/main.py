from fastapi import FastAPI

app = FastAPI(
    title="Distributed File Storage API",
    version="1.0.0",
    description="A production-ready distributed file storage system."
)

@app.get("/")
def root():
    return {
        "status": "running",
        "message": "Distributed File Storage API"
    }