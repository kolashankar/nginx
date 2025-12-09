"""
Recordings Routes

API endpoints for managing stream recordings and VOD
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
import logging
import os
from motor.motor_asyncio import AsyncIOMotorClient

from models.recording import Recording, RecordingCreate
from middleware.auth import get_current_user
from services.recording_service import RecordingService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/recordings", tags=["recordings"])

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Recording service
recording_service = RecordingService(db)


@router.post("/start", response_model=dict)
async def start_recording(
    stream_id: str,
    app_id: str,
    stream_url: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Start recording a live stream
    """
    try:
        # Verify app ownership
        app = await db.apps.find_one({"id": app_id, "user_id": current_user["id"]})
        if not app:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="App not found or access denied"
            )
        
        metadata = {
            "title": title,
            "description": description,
            "app_name": app.get("name")
        }
        
        recording = await recording_service.start_recording(
            stream_id=stream_id,
            app_id=app_id,
            stream_url=stream_url,
            metadata=metadata
        )
        
        return recording
    
    except Exception as e:
        logger.error(f"Error starting recording: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/stop/{stream_id}", response_model=dict)
async def stop_recording(
    stream_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Stop recording and upload to CDN
    """
    try:
        recording = await recording_service.stop_recording(stream_id)
        
        if not recording:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active recording found"
            )
        
        return recording
    
    except Exception as e:
        logger.error(f"Error stopping recording: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{recording_id}", response_model=dict)
async def get_recording(
    recording_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get recording details
    """
    recording = await recording_service.get_recording(recording_id)
    
    if not recording:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recording not found"
        )
    
    # Verify app ownership
    app = await db.apps.find_one({"id": recording["app_id"], "user_id": current_user["id"]})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return recording


@router.get("/", response_model=List[dict])
async def list_recordings(
    app_id: str,
    limit: int = Query(50, le=100),
    skip: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """
    List recordings for an app
    """
    # Verify app ownership
    app = await db.apps.find_one({"id": app_id, "user_id": current_user["id"]})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found or access denied"
        )
    
    recordings = await recording_service.list_recordings(
        app_id=app_id,
        limit=limit,
        skip=skip
    )
    
    return recordings


@router.delete("/{recording_id}")
async def delete_recording(
    recording_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a recording
    """
    # Get recording to verify ownership
    recording = await recording_service.get_recording(recording_id)
    
    if not recording:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recording not found"
        )
    
    # Verify app ownership
    app = await db.apps.find_one({"id": recording["app_id"], "user_id": current_user["id"]})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    success = await recording_service.delete_recording(recording_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete recording"
        )
    
    return {"message": "Recording deleted successfully"}


@router.post("/{recording_id}/thumbnail")
async def generate_thumbnail(
    recording_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate thumbnail for a recording
    """
    recording = await recording_service.get_recording(recording_id)
    
    if not recording:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recording not found"
        )
    
    # Verify app ownership
    app = await db.apps.find_one({"id": recording["app_id"], "user_id": current_user["id"]})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    thumbnail_url = await recording_service.generate_thumbnail(recording_id)
    
    return {"thumbnail_url": thumbnail_url}
