from typing import Annotated
from fastapi import APIRouter, HTTPException, Query
from sqlmodel import Session, select

from app.models import Target, TargetCreate, TargetUpdate
from app.database import engine

router = APIRouter(
    prefix="/api/v1/targets",
    tags=["targets"]
)


@router.get("/")
async def read_targets(
    offset: int = 0,
    limit: Annotated[int, Query(le=100)] = 100
) -> list[Target]:
    with Session(engine) as session:
        targets = session.exec(select(Target).offset(offset).limit(limit)).all()
    return list(targets)


@router.get("/{target_id}")
async def read_target(target_id: int) -> Target:
    with Session(engine) as session:
        target = session.get(Target, target_id)
        if not target:
            raise HTTPException(status_code=404, detail="Target not found")
        return target


@router.post("/")
async def create_target(new_target: TargetCreate) -> Target:
    target = Target(name=new_target.name, url=new_target.url)
    with Session(engine) as session:
        session.add(target)
        session.commit()
        session.refresh(target)
        return target
    

@router.patch("/{target_id}")
async def update_targets(target_id: int, new_target: TargetUpdate) -> Target:
    with Session(engine) as session:
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
    

@router.delete("/{target_id}")
async def delete_target(target_id: int):
    with Session(engine) as session:
        target = session.get(Target, target_id)
        if not target:
            raise HTTPException(status_code=404, detail="Target not found")
        session.delete(target)
        session.commit()
        return {"ok": True}