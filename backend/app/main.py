import uvicorn
from typing import Annotated
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, SQLModel, create_engine, select
from app.models import Target, TargetCreate, TargetUpdate


# Create an engine
sqlite_file_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

# Create the tables
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

# Create a session dependency
def get_session():
    with Session(engine) as session:
        yield session

SessionDep = Annotated[Session, Depends(get_session)]


app = FastAPI()

# CORS
origins = [
    "http://localhost:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create DB tables on startup
@app.on_event("startup")
def on_startup():
    create_db_and_tables()


# health check endpoint
@app.get("/api/v1/health")
def health_check() -> dict:
    return {"status": "ok"}


# targets endpoints
@app.get("/api/v1/targets/")
async def read_targets(
    session: SessionDep,
    offset: int = 0,
    limit: Annotated[int, Query(le=100)] = 100
) -> list[Target]:
    targets = session.exec(select(Target).offset(offset).limit(limit)).all()
    return targets


@app.post("/api/v1/targets/")
async def create_target(new_target: TargetCreate, session: SessionDep) -> Target:
    target = Target(name=new_target.name, url=new_target.url)
    session.add(target)
    session.commit()
    session.refresh(target)
    return target


@app.get("/api/v1/targets/{target_id}")
async def read_target(target_id: int, session: SessionDep) -> Target:
    target = session.get(Target, target_id)
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    return target


@app.patch("/api/v1/targets/{target_id}")
async def update_targets(target_id: int, new_target: TargetUpdate, session: SessionDep) -> Target:
    target = session.get(Target, target_id)
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    print("Target:", target)
    if new_target.name:
        target.name = new_target.name
    if new_target.url:
        target.url = new_target.url
    session.add(target)
    session.commit()
    session.refresh(target)
    return target


@app.delete("/api/v1/targets/{target_id}")
async def delete_target(target_id: int, session: SessionDep):
    target = session.get(Target, target_id)
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    session.delete(target)
    session.commit()
    return {"ok": True}


# TODO: build domains endpoints
# TODO: build scans endpoints
# TODO: build alerts endpoints
# TODO: build auth endpoints

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
