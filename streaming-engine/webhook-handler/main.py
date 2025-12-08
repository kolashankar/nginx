from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse
import os
import logging
from datetime import datetime
from typing import Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Universal Streaming Webhook Handler",
    description="Mock backend for NGINX RTMP webhook authentication",
    version="1.0.0"
)

# Configuration from environment
ALLOWED_STREAM_KEYS = os.getenv("ALLOWED_STREAM_KEYS", "demo,test,stream1").split(",")
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "your_secret_key_here")

# In-memory storage for demo (use database in production)
active_streams = {}
stream_stats = {}


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


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
    
    # Validate stream key
    if stream_key not in ALLOWED_STREAM_KEYS:
        logger.warning(f"[PUBLISH DENIED] Invalid stream key: {stream_key}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid stream key"
        )
    
    # Check if stream is already active
    if stream_key in active_streams:
        logger.warning(f"[PUBLISH DENIED] Stream already active: {stream_key}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Stream already in use"
        )
    
    # Store stream info
    active_streams[stream_key] = {
        "started_at": datetime.utcnow().isoformat(),
        "client_ip": client_ip,
        "app": app_name
    }
    
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
    
    # Remove from active streams
    if stream_key in active_streams:
        duration = "N/A"
        if active_streams[stream_key].get("started_at"):
            start_time = datetime.fromisoformat(active_streams[stream_key]["started_at"])
            duration = str(datetime.utcnow() - start_time)
        
        logger.info(f"[PUBLISH ENDED] Stream: {stream_key}, Duration: {duration}")
        del active_streams[stream_key]
    
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
    
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"status": "recorded", "stream_key": stream_key}
    )


@app.get("/streams/active")
async def get_active_streams():
    """Get all currently active streams"""
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
    is_active = stream_key in active_streams
    stats = stream_stats.get(stream_key, {})
    
    return {
        "stream_key": stream_key,
        "is_active": is_active,
        "active_info": active_streams.get(stream_key),
        "stats": stats
    }


@app.get("/")
async def root():
    """Root endpoint with API info"""
    return {
        "service": "Universal Streaming Webhook Handler",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "active_streams": "/streams/active",
            "stream_stats": "/streams/stats",
            "stream_info": "/streams/{stream_key}"
        },
        "allowed_stream_keys": ALLOWED_STREAM_KEYS
    }