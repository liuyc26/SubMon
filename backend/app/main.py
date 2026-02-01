import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import create_db_and_tables
from app.api import targets


app = FastAPI()

# CORS
origins = [
    "http://localhost:5173" # frontend port
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# health check endpoint
@app.get("/api/v1/health")
def health_check() -> dict:
    return {"status": "ok"}


app.include_router(targets.router)


# TODO: build domains endpoints
# TODO: build scans endpoints
# TODO: build alerts endpoints
# TODO: build auth endpoints

if __name__ == "__main__":
    create_db_and_tables()
    uvicorn.run(app, host="0.0.0.0", port=8000)
