from datetime import datetime, timedelta, timezone
from typing import Annotated
from fastapi import APIRouter, HTTPException, Query
from sqlmodel import Session, select

from app.models import Target, ScanRun
from app.database import engine

router = APIRouter(
    prefix="/api/v1/targets",
    tags=["Schedule"]
)

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