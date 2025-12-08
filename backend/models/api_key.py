from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid
import secrets

class ApiKey(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    app_id: str
    key: str = Field(default_factory=lambda: f"pk_{secrets.token_urlsafe(32)}")
    secret: str = Field(default_factory=lambda: f"sk_{secrets.token_urlsafe(48)}")
    name: Optional[str] = None
    is_active: bool = True
    last_used: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ApiKeyCreate(BaseModel):
    app_id: str
    name: Optional[str] = None

class ApiKeyResponse(BaseModel):
    id: str
    app_id: str
    key: str
    secret: str
    name: Optional[str] = None
    is_active: bool
    created_at: datetime
    last_used: Optional[datetime] = None
