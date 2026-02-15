from sqlmodel import Session, select

from app.models import ScanRun
from app.database import engine

from .scanner import run_scan

def get_next_in_queue() -> ScanRun | None:
    with Session(engine) as session:
        row = session.exec(
            select(ScanRun)
            .where(ScanRun.status == "queued")
            .order_by(getattr(ScanRun, "id"))
        ).first()
        return row

def mark_scan_run_status(scan_run_id: int, status: str) -> None:
    with Session(engine) as session:
        scan_run = session.get(ScanRun, scan_run_id)
        if not scan_run:
            return
        scan_run.status = status
        session.add(scan_run)
        session.commit()

def worker_loop():
    # TODO: infinite while loop
    # Finding the next target in queue
    next_target = get_next_in_queue()
    # Start scanning
    if next_target:
        # mark as running
        mark_scan_run_status(scan_run_id=next_target.id, status="running")
        # run scanner pipeline
        if run_scan(target_id=next_target.target_id):
            mark_scan_run_status(scan_run_id=next_target.id, status="success")
        else:
            mark_scan_run_status(scan_run_id=next_target.id, status="failed")
    else:
        print("[-] No target in queue.")
    
    # TODO: delete rows that are too old

if __name__ == "__main__":
    worker_loop()
