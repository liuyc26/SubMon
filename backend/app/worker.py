from time import sleep
from datetime import datetime, timedelta, timezone
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

def enqueue_due_scheduled_runs() -> None:
    now = datetime.now(timezone.utc)
    with Session(engine) as session:
        scheduled_runs = session.exec(
            select(ScanRun).where(
                ScanRun.is_scheduled == True,
                ScanRun.next_run_time != None,
                ScanRun.next_run_time <= now,
                ScanRun.status.notin_(("queued", "running")),
            )
        ).all()

        if not scheduled_runs:
            return

        for scan_run in scheduled_runs:
            scan_run.status = "queued"
            wait_minutes = scan_run.waiting_minutes or 60
            scan_run.next_run_time = now + timedelta(minutes=wait_minutes)
            session.add(scan_run)

        session.commit()

def worker_loop():
    while True:
        enqueue_due_scheduled_runs()
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
            sleep(10)
        

if __name__ == "__main__":
    worker_loop()
