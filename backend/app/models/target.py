from typing import Optional

from pydantic import HttpUrl
from sqlmodel import Field, SQLModel


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
