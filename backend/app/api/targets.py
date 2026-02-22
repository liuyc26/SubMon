from datetime import datetime, timedelta, timezone
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
        subdomains = session.exec(
            select(Subdomain)
            .where(Subdomain.target_id == target_id)
            .order_by(Subdomain.id.desc())
        ).all()
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
        subdomains = session.exec(
            select(Subdomain).where(Subdomain.target_id == target_id)
        ).all()
        for subdomain in subdomains:
            session.delete(subdomain)
        session.delete(target)
        session.commit()
        return {"ok": True}


# Enqueue Scan
@router.post("/{target_id}/scan")
async def enqueue_scan(target_id: int):
    with Session(engine) as session:
        target = session.get(Target, target_id)
        if not target:
            raise HTTPException(status_code=404, detail="Target not found")

        scan_target = session.exec(
            select(ScanRun).where(ScanRun.target_id == target_id)
        ).first()

        if scan_target:
            scan_target.status = "queued"
        else:
            scan_target = ScanRun(
                target_id=target_id,
                status="queued"
            )

        session.add(scan_target)
        session.commit()
        session.refresh(scan_target)
        return {"scan_run_id": scan_target.id}

# Schedule Scan
@router.patch("/{target_id}/schedule")
async def schedule_scan(
    target_id: int,
    enabled: bool = True,
    waiting_minutes: Annotated[int, Query(gt=0, le=10080)] = 60
):
    with Session(engine) as session:
        target = session.get(Target, target_id)
        if not target:
            raise HTTPException(status_code=404, detail="Target not found")

        scan_target = session.exec(
            select(ScanRun).where(ScanRun.target_id == target_id)
        ).first()

        if enabled:
            next_run_time = datetime.now(timezone.utc) + timedelta(minutes=waiting_minutes)
            if scan_target:
                scan_target.is_scheduled = True
                scan_target.waiting_minutes = waiting_minutes
                scan_target.next_run_time = next_run_time
                if scan_target.status not in ("queued", "running"):
                    scan_target.status = "queued"
            else:
                scan_target = ScanRun(
                    target_id=target_id,
                    status="queued",
                    is_scheduled=True,
                    waiting_minutes=waiting_minutes,
                    next_run_time=next_run_time
                )
        else:
            if not scan_target:
                raise HTTPException(status_code=404, detail="Scheduled scan not found")
            scan_target.is_scheduled = False
            scan_target.next_run_time = None

        session.add(scan_target)
        session.commit()
        session.refresh(scan_target)
        return {
            "scan_run_id": scan_target.id,
            "is_scheduled": scan_target.is_scheduled,
            "waiting_minutes": scan_target.waiting_minutes,
            "next_run_time": scan_target.next_run_time
        }
