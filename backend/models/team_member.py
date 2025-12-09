"""
Team Member Model
"""

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone
import uuid


class TeamMember(BaseModel):
    id: str = str(uuid.uuid4())
    app_id: str
    user_id: Optional[str] = None
    email: EmailStr
    role: str  # owner, admin, editor, viewer
    status: str = "pending"  # pending, active, cancelled
    invited_by: str
    created_at: datetime = datetime.now(timezone.utc)
    accepted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class TeamMemberCreate(BaseModel):
    app_id: str
    email: EmailStr
    role: str
