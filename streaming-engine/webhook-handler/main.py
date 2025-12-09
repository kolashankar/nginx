from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse
import os
import logging
from datetime import datetime
from typing import Optional
import httpx
import redis

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Universal Streaming Webhook Handler",
    description="NGINX RTMP webhook authentication with Control Plane integration",
    version="2.0.0"
)

# Configuration from environment
CONTROL_PLANE_URL = os.getenv("CONTROL_PLANE_URL", "http://localhost:8001/api")
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "your_secret_key_here")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Redis client for state management
try:
    redis_client = redis.from_url(REDIS_URL)
    redis_available = True
except Exception as e:
    logger.error(f"Redis connection failed: {str(e)}")
    redis_available = False

# HTTP client for Control Plane API calls
http_client = httpx.AsyncClient(timeout=10.0)

# In-memory storage fallback (use Redis in production)
active_streams = {}
stream_stats = {}


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "control_plane": CONTROL_PLANE_URL,
        "redis": "connected" if redis_available else "disconnected"
    }


async def validate_stream_key(stream_key: str, app_name: str) -> dict:
    """
    Validate stream key against Control Plane API
    
    Returns:
        Stream info if valid, raises HTTPException if invalid
    """
    try:
        # Call Control Plane API to validate stream key
        response = await http_client.get(
            f"{CONTROL_PLANE_URL}/streams/validate/{stream_key}"
        )
        
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 404:
            logger.warning(f"Stream key not found: {stream_key}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid stream key"
            )
        else:
            logger.error(f"Control Plane API error: {response.status_code}")
            # Fail open in case of API issues
            return {"stream_key": stream_key, "validated": False}
    
    except httpx.RequestError as e:
        logger.error(f"Error connecting to Control Plane: {str(e)}")
        # Fail open - allow stream if Control Plane is unavailable
        return {"stream_key": stream_key, "validated": False}


async def notify_control_plane(event_type: str, stream_key: str, data: dict):
    """
    Send event notification to Control Plane
    """
    try:
        await http_client.post(
            f"{CONTROL_PLANE_URL}/streams/events",
            json={
                "event_type": event_type,
                "stream_key": stream_key,
                "data": data,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    except Exception as e:
        logger.error(f"Error notifying Control Plane: {str(e)}")


@app.post("/auth/publish")
async def auth_publish(request: Request):
    """
    Webhook called when a publisher tries to start streaming.
    NGINX sends: name (stream key), addr (IP), app (application name)
    Return 2xx to allow, 4xx/5xx to deny.
    """
    form_data = await request.form()
    stream_key = form_data.get("name", "")
    client_ip = form_data.get("addr", "")
    app_name = form_data.get("app", "")
    
    logger.info(f"[PUBLISH] Stream: {stream_key}, IP: {client_ip}, App: {app_name}")
    
    # Validate stream key against Control Plane
    stream_info = await validate_stream_key(stream_key, app_name)
    
    if not stream_info:
        logger.warning(f"[PUBLISH DENIED] Invalid stream key: {stream_key}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid stream key"
        )
    
    # Check if stream is already active
    if redis_available:
        is_active = redis_client.get(f"stream:{stream_key}:status")
        if is_active == b"live":
            logger.warning(f"[PUBLISH DENIED] Stream already active: {stream_key}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Stream already in use"
            )
    else:
        if stream_key in active_streams:
            logger.warning(f"[PUBLISH DENIED] Stream already active: {stream_key}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Stream already in use"
            )
    
    # Store stream info
    stream_data = {
        "started_at": datetime.utcnow().isoformat(),
        "client_ip": client_ip,
        "app": app_name,
        "stream_info": stream_info
    }
    
    if redis_available:
        redis_client.set(f"stream:{stream_key}:status", "live")
        redis_client.set(f"stream:{stream_key}:data", str(stream_data))
        redis_client.expire(f"stream:{stream_key}:status", 86400)  # 24 hours
    else:
        active_streams[stream_key] = stream_data
    
    # Initialize stats
    if stream_key not in stream_stats:
        stream_stats[stream_key] = {
            "total_publishes": 0,
            "total_plays": 0,
            "last_publish": None,
            "last_play": None
        }
    
    stream_stats[stream_key]["total_publishes"] += 1
    stream_stats[stream_key]["last_publish"] = datetime.utcnow().isoformat()
    
    # Notify Control Plane
    await notify_control_plane("stream.live", stream_key, stream_data)
    
    logger.info(f"[PUBLISH ALLOWED] Stream: {stream_key}")
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"status": "allowed", "stream_key": stream_key}
    )


@app.post("/auth/publish_done")
async def auth_publish_done(request: Request):
    """
    Webhook called when a publisher stops streaming.
    """
    form_data = await request.form()
    stream_key = form_data.get("name", "")
    
    logger.info(f"[PUBLISH ENDED] Stream: {stream_key}")
    
    # Get stream data
    duration = "N/A"
    stream_data = None
    
    if redis_available:
        stream_data = redis_client.get(f"stream:{stream_key}:data")
        redis_client.delete(f"stream:{stream_key}:status")
        redis_client.delete(f"stream:{stream_key}:data")
    else:
        if stream_key in active_streams:
            stream_data = active_streams[stream_key]
            if stream_data.get("started_at"):
                start_time = datetime.fromisoformat(stream_data["started_at"])
                duration = str(datetime.utcnow() - start_time)
            del active_streams[stream_key]
    
    # Notify Control Plane
    await notify_control_plane("stream.offline", stream_key, {
        "ended_at": datetime.utcnow().isoformat(),
        "duration": duration
    })
    
    logger.info(f"[PUBLISH ENDED] Stream: {stream_key}, Duration: {duration}")
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"status": "recorded", "stream_key": stream_key}
    )


@app.post("/auth/play")
async def auth_play(request: Request):
    """
    Webhook called when a viewer tries to play a stream.
    Can be used for viewer authentication and access control.
    """
    form_data = await request.form()
    stream_key = form_data.get("name", "")
    client_ip = form_data.get("addr", "")
    
    logger.info(f"[PLAY] Stream: {stream_key}, IP: {client_ip}")
    
    # Update stats
    if stream_key not in stream_stats:
        stream_stats[stream_key] = {
            "total_publishes": 0,
            "total_plays": 0,
            "last_publish": None,
            "last_play": None
        }
    
    stream_stats[stream_key]["total_plays"] += 1
    stream_stats[stream_key]["last_play"] = datetime.utcnow().isoformat()
    
    # Increment viewer count in Redis
    if redis_available:
        redis_client.incr(f"stream:{stream_key}:viewers")
    
    # Allow all playback by default (add your logic here)
    logger.info(f"[PLAY ALLOWED] Stream: {stream_key}")
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"status": "allowed", "stream_key": stream_key}
    )


@app.post("/auth/play_done")
async def auth_play_done(request: Request):
    """
    Webhook called when a viewer stops watching.
    """
    form_data = await request.form()
    stream_key = form_data.get("name", "")
    
    logger.info(f"[PLAY ENDED] Stream: {stream_key}")
    
    # Decrement viewer count
    if redis_available:
        redis_client.decr(f"stream:{stream_key}:viewers")
    
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"status": "recorded", "stream_key": stream_key}
    )


@app.get("/streams/active")
async def get_active_streams():
    """Get all currently active streams"""
    if redis_available:
        keys = redis_client.keys("stream:*:status")
        active = [k.decode().split(":")[1] for k in keys if redis_client.get(k) == b"live"]
        return {
            "active_streams": active,
            "count": len(active)
        }
    else:
        return {
            "active_streams": active_streams,
            "count": len(active_streams)
        }


@app.get("/streams/stats")
async def get_stream_stats():
    """Get statistics for all streams"""
    return {
        "stream_stats": stream_stats,
        "total_streams": len(stream_stats)
    }


@app.get("/streams/{stream_key}")
async def get_stream_info(stream_key: str):
    """Get info about a specific stream"""
    is_active = False
    active_info = None
    
    if redis_available:
        status = redis_client.get(f"stream:{stream_key}:status")
        is_active = status == b"live"
        if is_active:
            active_info = redis_client.get(f"stream:{stream_key}:data")
    else:
        is_active = stream_key in active_streams
        active_info = active_streams.get(stream_key)
    
    stats = stream_stats.get(stream_key, {})
    
    return {
        "stream_key": stream_key,
        "is_active": is_active,
        "active_info": active_info,
        "stats": stats
    }


@app.get("/")
async def root():
    """Root endpoint with API info"""
    return {
        "service": "Universal Streaming Webhook Handler",
        "version": "2.0.0",
        "control_plane": CONTROL_PLANE_URL,
        "endpoints": {
            "health": "/health",
            "active_streams": "/streams/active",
            "stream_stats": "/streams/stats",
            "stream_info": "/streams/{stream_key}"
        }
    }


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await http_client.aclose()
