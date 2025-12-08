from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from models.stream import Stream, StreamCreate, StreamUpdate, StreamResponse
from utils.jwt_handler import decode_access_token, create_playback_token
from utils.redis_client import mark_stream_live, mark_stream_offline, is_stream_live, get_stream_viewers
from datetime import datetime, timezone

router = APIRouter(prefix="/streams", tags=["Streams"])
security = HTTPBearer()

def get_db():
    from server import db
    return db

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    return payload["user_id"]

@router.post("/", response_model=StreamResponse, status_code=status.HTTP_201_CREATED)
async def create_stream(
    stream_data: StreamCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Create a new stream for an app
    """
    # Verify app belongs to user
    app = await db.apps.find_one({"id": stream_data.app_id, "user_id": user_id})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found"
        )
    
    stream = Stream(
        app_id=stream_data.app_id,
        name=stream_data.name,
        description=stream_data.description,
        settings=stream_data.settings or {}
    )
    
    stream_dict = stream.model_dump()
    stream_dict['created_at'] = stream_dict['created_at'].isoformat()
    stream_dict['updated_at'] = stream_dict['updated_at'].isoformat()
    if stream_dict.get('started_at'):
        stream_dict['started_at'] = stream_dict['started_at'].isoformat()
    if stream_dict.get('ended_at'):
        stream_dict['ended_at'] = stream_dict['ended_at'].isoformat()
    
    await db.streams.insert_one(stream_dict)
    
    return StreamResponse(
        id=stream.id,
        app_id=stream.app_id,
        stream_key=stream.stream_key,
        name=stream.name,
        description=stream.description,
        is_live=stream.is_live,
        viewer_count=stream.viewer_count,
        started_at=stream.started_at,
        settings=stream.settings,
        created_at=stream.created_at
    )

@router.get("/", response_model=List[StreamResponse])
async def get_streams(
    app_id: str = None,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get all streams for user's apps
    """
    if app_id:
        # Verify app belongs to user
        app = await db.apps.find_one({"id": app_id, "user_id": user_id})
        if not app:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="App not found"
            )
        streams = await db.streams.find({"app_id": app_id}, {"_id": 0}).to_list(100)
    else:
        # Get all apps for user
        apps = await db.apps.find({"user_id": user_id}, {"_id": 0}).to_list(100)
        app_ids = [app["id"] for app in apps]
        streams = await db.streams.find({"app_id": {"$in": app_ids}}, {"_id": 0}).to_list(100)
    
    # Update live status from Redis
    for stream in streams:
        stream["is_live"] = is_stream_live(stream["stream_key"])
        if stream["is_live"]:
            stream["viewer_count"] = get_stream_viewers(stream["stream_key"])
    
    return [
        StreamResponse(
            id=s["id"],
            app_id=s["app_id"],
            stream_key=s["stream_key"],
            name=s["name"],
            description=s.get("description"),
            is_live=s.get("is_live", False),
            viewer_count=s.get("viewer_count", 0),
            started_at=datetime.fromisoformat(s["started_at"]) if s.get("started_at") else None,
            settings=s.get("settings", {}),
            created_at=datetime.fromisoformat(s["created_at"])
        )
        for s in streams
    ]

@router.get("/{stream_id}", response_model=StreamResponse)
async def get_stream(
    stream_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get a specific stream
    """
    stream = await db.streams.find_one({"id": stream_id}, {"_id": 0})
    if not stream:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stream not found"
        )
    
    # Verify user owns the app
    app = await db.apps.find_one({"id": stream["app_id"], "user_id": user_id})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update live status
    stream["is_live"] = is_stream_live(stream["stream_key"])
    if stream["is_live"]:
        stream["viewer_count"] = get_stream_viewers(stream["stream_key"])
    
    return StreamResponse(
        id=stream["id"],
        app_id=stream["app_id"],
        stream_key=stream["stream_key"],
        name=stream["name"],
        description=stream.get("description"),
        is_live=stream.get("is_live", False),
        viewer_count=stream.get("viewer_count", 0),
        started_at=datetime.fromisoformat(stream["started_at"]) if stream.get("started_at") else None,
        settings=stream.get("settings", {}),
        created_at=datetime.fromisoformat(stream["created_at"])
    )

@router.get("/{stream_id}/playback-token")
async def get_playback_token(
    stream_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get a signed JWT token for HLS playback
    """
    stream = await db.streams.find_one({"id": stream_id}, {"_id": 0})
    if not stream:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stream not found"
        )
    
    # Verify user owns the app
    app = await db.apps.find_one({"id": stream["app_id"], "user_id": user_id})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    token = create_playback_token(stream["stream_key"], stream["app_id"])
    
    return {
        "token": token,
        "stream_key": stream["stream_key"],
        "playback_url": f"/hls/{stream['stream_key']}.m3u8?token={token}"
    }

@router.put("/{stream_id}", response_model=StreamResponse)
async def update_stream(
    stream_id: str,
    stream_data: StreamUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Update a stream
    """
    stream = await db.streams.find_one({"id": stream_id})
    if not stream:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stream not found"
        )
    
    # Verify user owns the app
    app = await db.apps.find_one({"id": stream["app_id"], "user_id": user_id})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update fields
    update_data = {k: v for k, v in stream_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.streams.update_one(
        {"id": stream_id},
        {"$set": update_data}
    )
    
    # Fetch updated stream
    updated_stream = await db.streams.find_one({"id": stream_id}, {"_id": 0})
    updated_stream["is_live"] = is_stream_live(updated_stream["stream_key"])
    
    return StreamResponse(
        id=updated_stream["id"],
        app_id=updated_stream["app_id"],
        stream_key=updated_stream["stream_key"],
        name=updated_stream["name"],
        description=updated_stream.get("description"),
        is_live=updated_stream.get("is_live", False),
        viewer_count=updated_stream.get("viewer_count", 0),
        started_at=datetime.fromisoformat(updated_stream["started_at"]) if updated_stream.get("started_at") else None,
        settings=updated_stream.get("settings", {}),
        created_at=datetime.fromisoformat(updated_stream["created_at"])
    )

@router.delete("/{stream_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_stream(
    stream_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Delete a stream
    """
    stream = await db.streams.find_one({"id": stream_id})
    if not stream:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stream not found"
        )
    
    # Verify user owns the app
    app = await db.apps.find_one({"id": stream["app_id"], "user_id": user_id})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    await db.streams.delete_one({"id": stream_id})
    return None
