"""
Team Collaboration Routes

API endpoints for multi-user access and team management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
import logging
import os
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr
import uuid

from middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/teams", tags=["teams"])

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Role definitions
ROLES = {
    "owner": {
        "name": "Owner",
        "permissions": ["*"],  # All permissions
        "description": "Full access to app and team management"
    },
    "admin": {
        "name": "Admin",
        "permissions": ["read", "write", "delete", "manage_streams", "manage_webhooks", "view_analytics"],
        "description": "Can manage app settings and content"
    },
    "editor": {
        "name": "Editor",
        "permissions": ["read", "write", "manage_streams"],
        "description": "Can create and manage streams"
    },
    "viewer": {
        "name": "Viewer",
        "permissions": ["read", "view_analytics"],
        "description": "Read-only access to app and analytics"
    }
}


class TeamMemberInvite(BaseModel):
    email: EmailStr
    role: str
    app_id: str


class TeamMemberUpdate(BaseModel):
    role: str


@router.post("/invite")
async def invite_team_member(
    invite: TeamMemberInvite,
    current_user: dict = Depends(get_current_user)
):
    """
    Invite a team member to an app
    """
    # Validate role
    if invite.role not in ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(ROLES.keys())}"
        )
    
    # Verify app ownership or admin access
    app = await db.apps.find_one({"id": invite.app_id, "user_id": current_user["id"]})
    if not app:
        # Check if current user is admin of this app
        member = await db.team_members.find_one({
            "app_id": invite.app_id,
            "user_id": current_user["id"],
            "role": {"$in": ["owner", "admin"]},
            "status": "active"
        })
        
        if not member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only app owners and admins can invite team members"
            )
    
    # Check if user already invited
    existing = await db.team_members.find_one({
        "app_id": invite.app_id,
        "email": invite.email,
        "status": {"$in": ["pending", "active"]}
    })
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already invited or is a member"
        )
    
    # Create invitation
    invitation = {
        "id": str(uuid.uuid4()),
        "app_id": invite.app_id,
        "email": invite.email,
        "role": invite.role,
        "invited_by": current_user["id"],
        "status": "pending",
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": (datetime.utcnow() + timedelta(days=7)).isoformat()
    }
    
    await db.team_members.insert_one(invitation)
    
    # In production, send email invitation
    logger.info(f"Team member invited: {invite.email} to app {invite.app_id}")
    
    return invitation


@router.get("/app/{app_id}/members")
async def get_team_members(
    app_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all team members for an app
    """
    # Verify access
    app = await db.apps.find_one({"id": app_id, "user_id": current_user["id"]})
    if not app:
        member = await db.team_members.find_one({
            "app_id": app_id,
            "user_id": current_user["id"],
            "status": "active"
        })
        
        if not member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    
    # Get all members
    members = await db.team_members.find(
        {"app_id": app_id},
        {"_id": 0}
    ).to_list(100)
    
    # Convert ISO strings
    for member in members:
        if isinstance(member.get('created_at'), str):
            member['created_at'] = datetime.fromisoformat(member['created_at'])
        if isinstance(member.get('expires_at'), str):
            member['expires_at'] = datetime.fromisoformat(member['expires_at'])
    
    # Add role details
    for member in members:
        member['role_details'] = ROLES.get(member['role'], {})
    
    return {"members": members}


@router.patch("/members/{member_id}")
async def update_team_member(
    member_id: str,
    update: TeamMemberUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update team member role
    """
    # Validate role
    if update.role not in ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(ROLES.keys())}"
        )
    
    # Get member
    member = await db.team_members.find_one({"id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found"
        )
    
    # Verify access (must be owner or admin)
    app = await db.apps.find_one({"id": member["app_id"], "user_id": current_user["id"]})
    if not app:
        admin_member = await db.team_members.find_one({
            "app_id": member["app_id"],
            "user_id": current_user["id"],
            "role": {"$in": ["owner", "admin"]},
            "status": "active"
        })
        
        if not admin_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only owners and admins can update roles"
            )
    
    # Update role
    result = await db.team_members.update_one(
        {"id": member_id},
        {"$set": {"role": update.role, "updated_at": datetime.utcnow().isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update member"
        )
    
    return {"message": "Member role updated successfully"}


@router.delete("/members/{member_id}")
async def remove_team_member(
    member_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Remove team member from app
    """
    # Get member
    member = await db.team_members.find_one({"id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found"
        )
    
    # Verify access
    app = await db.apps.find_one({"id": member["app_id"], "user_id": current_user["id"]})
    if not app:
        admin_member = await db.team_members.find_one({
            "app_id": member["app_id"],
            "user_id": current_user["id"],
            "role": {"$in": ["owner", "admin"]},
            "status": "active"
        })
        
        if not admin_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only owners and admins can remove members"
            )
    
    # Delete member
    result = await db.team_members.delete_one({"id": member_id})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove member"
        )
    
    return {"message": "Team member removed successfully"}


@router.post("/accept/{invitation_id}")
async def accept_invitation(
    invitation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Accept team invitation
    """
    # Get invitation
    invitation = await db.team_members.find_one(
        {"id": invitation_id, "email": current_user["email"], "status": "pending"},
        {"_id": 0}
    )
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found or already accepted"
        )
    
    # Check if expired
    if isinstance(invitation.get('expires_at'), str):
        expires_at = datetime.fromisoformat(invitation['expires_at'])
    else:
        expires_at = invitation.get('expires_at')
    
    if expires_at and expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Invitation has expired"
        )
    
    # Accept invitation
    result = await db.team_members.update_one(
        {"id": invitation_id},
        {
            "$set": {
                "status": "active",
                "user_id": current_user["id"],
                "accepted_at": datetime.utcnow().isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to accept invitation"
        )
    
    return {"message": "Invitation accepted successfully"}


@router.get("/my-teams")
async def get_my_teams(
    current_user: dict = Depends(get_current_user)
):
    """
    Get all teams/apps the current user is a member of
    """
    # Get team memberships
    memberships = await db.team_members.find(
        {"user_id": current_user["id"], "status": "active"},
        {"_id": 0}
    ).to_list(100)
    
    # Get app details
    app_ids = [m["app_id"] for m in memberships]
    apps = await db.apps.find(
        {"id": {"$in": app_ids}},
        {"_id": 0}
    ).to_list(100)
    
    # Combine data
    result = []
    for membership in memberships:
        app = next((a for a in apps if a["id"] == membership["app_id"]), None)
        if app:
            result.append({
                "app": app,
                "role": membership["role"],
                "role_details": ROLES.get(membership["role"], {}),
                "joined_at": membership.get("accepted_at")
            })
    
    return {"teams": result}
