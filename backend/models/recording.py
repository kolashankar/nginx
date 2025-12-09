"""
Recording Model

Represents a recorded stream stored in Telegram CDN
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
import uuid


class RecordingBase(BaseModel):
    stream_id: str
    app_id: str
    title: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[int] = 0  # in seconds
    file_size: Optional[int] = 0  # in bytes
    status: str = "processing"  # processing, completed, failed


class RecordingCreate(RecordingBase):
    pass


class Recording(RecordingBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    telegram_file_id: Optional[str] = None
    telegram_message_id: Optional[int] = None
    cdn_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = {}
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "rec_123456",
                "stream_id": "stream_789",
                "app_id": "app_456",
                "title": "Gaming Stream VOD",
                "description": "Epic gaming session",
                "duration": 3600,
                "file_size": 524288000,
                "status": "completed",
                "telegram_file_id": "BAACAgIAAxkBAAI123456789",
                "cdn_url": "https://cdn.telegram.org/file/BAACAgIAAxkBAAI123456789",
                "created_at": "2024-12-09T10:00:00Z"
            }
        }
