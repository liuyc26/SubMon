from sqlmodel import Field, SQLModel
from typing import Optional


class Target(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    url: str

class TargetCreate(SQLModel):
    name: str
    url: Optional[str] = None

class TargetUpdate(SQLModel):
    name: Optional[str] = None
    url: Optional[str] = None