"""
Audit Log Model

Tracks all security-relevant actions in the system
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
import uuid


class AuditLogBase(BaseModel):
    user_id: Optional[str] = None
    app_id: Optional[str] = None
    action: str  # create_stream, delete_app, regenerate_key, etc.
    resource_type: str  # stream, app, api_key, webhook, etc.
    resource_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    status: str  # success, failure, denied
    details: Optional[Dict[str, Any]] = {}


class AuditLogCreate(AuditLogBase):
    pass


class AuditLog(AuditLogBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "log_123456",
                "user_id": "user_789",
                "app_id": "app_456",
                "action": "regenerate_api_key",
                "resource_type": "api_key",
                "resource_id": "key_321",
                "ip_address": "192.168.1.100",
                "status": "success",
                "timestamp": "2024-12-09T10:00:00Z"
            }
        }
