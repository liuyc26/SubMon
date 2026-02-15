from pydantic import HttpUrl
from sqlmodel import Field, SQLModel
from typing import Optional
from datetime import datetime, timezone


class Target(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    url: str

class TargetCreate(SQLModel):
    name: str
    url: Optional[HttpUrl] = None

class TargetUpdate(SQLModel):
    name: Optional[str] = None
    url: Optional[str] = None


class Subdomain(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    url: str
    title: str
    status: str
    target_id: int | None = Field(default=None, foreign_key="target.id")

class SubdomainCreate(SQLModel):
    url: HttpUrl
    title: Optional[str] = None
    status: Optional[str] = None

class SubdomainUpdate(SQLModel):
    url: Optional[HttpUrl] = None
    title: Optional[str] = None
    status: Optional[str] = None


class ScanRun(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    target_id: int
    status: str = 'queued' # queued/running/success/failed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))