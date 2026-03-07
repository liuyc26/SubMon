from fastapi import APIRouter, HTTPException
from sqlmodel import Session, select

from app.models import Target, ScanRun
from app.database import engine

router = APIRouter(
    prefix="/api/v1/targets",
    tags=["Scan"]
)

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