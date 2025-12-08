from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional
from datetime import datetime, timezone
import uuid

class Webhook(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    app_id: str
    url: str
    events: List[str] = Field(default_factory=list)
    secret: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WebhookCreate(BaseModel):
    app_id: str
    url: str
    events: List[str]
    secret: Optional[str] = None

class WebhookUpdate(BaseModel):
    url: Optional[str] = None
    events: Optional[List[str]] = None
    secret: Optional[str] = None
    is_active: Optional[bool] = None

class WebhookResponse(BaseModel):
    id: str
    app_id: str
    url: str
    events: List[str]
    is_active: bool
    created_at: datetime

class WebhookLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    webhook_id: str
    event_type: str
    payload: dict
    status_code: Optional[int] = None
    response_body: Optional[str] = None
    error: Optional[str] = None
    attempt: int = 1
    delivered: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
