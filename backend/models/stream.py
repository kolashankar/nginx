from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import secrets

class Stream(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    app_id: str
    stream_key: str = Field(default_factory=lambda: secrets.token_urlsafe(24))
    name: str
    description: Optional[str] = None
    is_live: bool = False
    viewer_count: int = 0
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    settings: Dict[str, Any] = Field(default_factory=lambda: {
        "quality": "auto",
        "recording_enabled": False,
        "chat_enabled": True,
        "moderation_enabled": True
    })
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StreamCreate(BaseModel):
    app_id: str
    name: str
    description: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class StreamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class StreamResponse(BaseModel):
    id: str
    app_id: str
    stream_key: str
    name: str
    description: Optional[str] = None
    is_live: bool
    viewer_count: int
    started_at: Optional[datetime] = None
    settings: Dict[str, Any]
    created_at: datetime
