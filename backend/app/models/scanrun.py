from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class ScanRun(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    target_id: int
    status: str = "queued"  # queued/running/success/failed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # scheduler
    is_scheduled: bool = False
    waiting_minutes: Optional[int] = 60
    next_run_time: Optional[datetime] = None
