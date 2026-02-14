from typing import Annotated
from fastapi import APIRouter, HTTPException, Query
from sqlmodel import Session, select

from app.models import Target, TargetCreate, TargetUpdate, Subdomain, ScanRun
from app.database import engine

router = APIRouter(
    prefix="/api/v1/targets",
    tags=["Targets"]
)


@router.get("/")
async def read_all_targets(
    offset: int = 0,
    limit: Annotated[int, Query(le=100)] = 100
) -> list[Target]:
    with Session(engine) as session:
        targets = session.exec(select(Target).offset(offset).limit(limit)).all()
        return list(targets)


@router.get("/{target_id}")
async def read_target(target_id: int) -> dict[str, Target | list[Subdomain]]:
    with Session(engine) as session:
        target = session.get(Target, target_id)
        if not target:
            raise HTTPException(status_code=404, detail="Target not found")
        subdomains = session.exec(select(Subdomain).where(Subdomain.target_id == target_id)).all()
        return {"target": target, "subdomains": list(subdomains)}


@router.post("/")
async def create_target(new_target: TargetCreate) -> Target:
    with Session(engine) as session:
        target = Target(
            name=new_target.name, 
            url=str(new_target.url)
        )
        session.add(target)
        session.commit()
        session.refresh(target)
        return target
    

@router.patch("/{target_id}")
async def update_target(target_id: int, new_target: TargetUpdate) -> Target:
    with Session(engine) as session:
        target = session.get(Target, target_id)
        if not target:
            raise HTTPException(status_code=404, detail="Target not found")
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

# Enqueue Scan
@router.post("/{target_id}/scan")
async def enqueue_scan(target_id: int):
    with Session(engine) as session:
        scan_target = ScanRun(
            target_id=target_id,
            status='queued'
        )
        session.add(scan_target)
        session.commit()
        return {"scan_run_id": scan_target.id}