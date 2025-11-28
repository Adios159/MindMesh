from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime
import uuid

class Session(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    title: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Node(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    session_id: str = Field(index=True)
    user: str
    text: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Link(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    session_id: str = Field(index=True)
    source_id: str
    target_id: str
    similarity: float