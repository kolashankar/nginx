"""
Transcoding Profiles Routes

API endpoints for managing custom transcoding configurations
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
import logging
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

from models.transcoding_profile import TranscodingProfile, TranscodingProfileCreate
from middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/transcoding-profiles", tags=["transcoding"])

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


@router.post("/", response_model=TranscodingProfile)
async def create_profile(
    profile: TranscodingProfileCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new transcoding profile
    """
    try:
        # Verify app ownership
        app = await db.apps.find_one({"id": profile.app_id, "user_id": current_user["id"]})
        if not app:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="App not found or access denied"
            )
        
        # Create profile
        profile_obj = TranscodingProfile(**profile.model_dump())
        profile_dict = profile_obj.model_dump()
        profile_dict['created_at'] = profile_dict['created_at'].isoformat()
        profile_dict['updated_at'] = profile_dict['updated_at'].isoformat()
        
        await db.transcoding_profiles.insert_one(profile_dict)
        
        logger.info(f"Transcoding profile created: {profile_obj.id}")
        return profile_obj
    
    except Exception as e:
        logger.error(f"Error creating transcoding profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{app_id}", response_model=List[TranscodingProfile])
async def list_profiles(
    app_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    List transcoding profiles for an app
    """
    # Verify app ownership
    app = await db.apps.find_one({"id": app_id, "user_id": current_user["id"]})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found or access denied"
        )
    
    profiles = await db.transcoding_profiles.find(
        {"app_id": app_id},
        {"_id": 0}
    ).to_list(100)
    
    # Convert ISO strings back to datetime
    for profile in profiles:
        if isinstance(profile.get('created_at'), str):
            profile['created_at'] = datetime.fromisoformat(profile['created_at'])
        if isinstance(profile.get('updated_at'), str):
            profile['updated_at'] = datetime.fromisoformat(profile['updated_at'])
    
    return profiles


@router.get("/profile/{profile_id}", response_model=TranscodingProfile)
async def get_profile(
    profile_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific transcoding profile
    """
    profile = await db.transcoding_profiles.find_one({"id": profile_id}, {"_id": 0})
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    # Verify app ownership
    app = await db.apps.find_one({"id": profile["app_id"], "user_id": current_user["id"]})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Convert ISO strings back to datetime
    if isinstance(profile.get('created_at'), str):
        profile['created_at'] = datetime.fromisoformat(profile['created_at'])
    if isinstance(profile.get('updated_at'), str):
        profile['updated_at'] = datetime.fromisoformat(profile['updated_at'])
    
    return profile


@router.put("/profile/{profile_id}", response_model=TranscodingProfile)
async def update_profile(
    profile_id: str,
    profile_update: TranscodingProfileCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a transcoding profile
    """
    # Get existing profile
    existing_profile = await db.transcoding_profiles.find_one({"id": profile_id})
    
    if not existing_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    # Verify app ownership
    app = await db.apps.find_one({"id": existing_profile["app_id"], "user_id": current_user["id"]})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update profile
    update_dict = profile_update.model_dump()
    update_dict['updated_at'] = datetime.utcnow().isoformat()
    
    await db.transcoding_profiles.update_one(
        {"id": profile_id},
        {"$set": update_dict}
    )
    
    # Get updated profile
    updated_profile = await db.transcoding_profiles.find_one({"id": profile_id}, {"_id": 0})
    
    # Convert ISO strings back to datetime
    if isinstance(updated_profile.get('created_at'), str):
        updated_profile['created_at'] = datetime.fromisoformat(updated_profile['created_at'])
    if isinstance(updated_profile.get('updated_at'), str):
        updated_profile['updated_at'] = datetime.fromisoformat(updated_profile['updated_at'])
    
    logger.info(f"Transcoding profile updated: {profile_id}")
    return updated_profile


@router.delete("/profile/{profile_id}")
async def delete_profile(
    profile_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a transcoding profile
    """
    # Get profile to verify ownership
    profile = await db.transcoding_profiles.find_one({"id": profile_id})
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    # Verify app ownership
    app = await db.apps.find_one({"id": profile["app_id"], "user_id": current_user["id"]})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Delete profile
    result = await db.transcoding_profiles.delete_one({"id": profile_id})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete profile"
        )
    
    logger.info(f"Transcoding profile deleted: {profile_id}")
    return {"message": "Profile deleted successfully"}


@router.post("/profile/{profile_id}/set-default")
async def set_default_profile(
    profile_id: str,
    app_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Set a profile as the default for an app
    """
    # Verify app ownership
    app = await db.apps.find_one({"id": app_id, "user_id": current_user["id"]})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found or access denied"
        )
    
    # Unset all defaults for this app
    await db.transcoding_profiles.update_many(
        {"app_id": app_id},
        {"$set": {"is_default": False}}
    )
    
    # Set new default
    result = await db.transcoding_profiles.update_one(
        {"id": profile_id, "app_id": app_id},
        {"$set": {"is_default": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    logger.info(f"Default profile set: {profile_id} for app {app_id}")
    return {"message": "Default profile updated"}
