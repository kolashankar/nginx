"""
Integrated Webhook Handler for NGINX RTMP

Connects NGINX to the Control Plane API for stream validation
and real-time event dispatching
"""

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse
import os
import logging
import httpx
from datetime import datetime
from typing import Optional
import asyncio

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="RealCast NGINX Integration",
    description="Webhook handler connecting NGINX RTMP to Control Plane API",
    version="2.0.0"
)

# Configuration
CONTROL_PLANE_URL = os.getenv("CONTROL_PLANE_URL", "http://localhost:8001/api")
REALTIME_SERVER_URL = os.getenv("REALTIME_SERVER_URL", "http://localhost:8002")
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "your_secret_key_here")

# HTTP client
http_client = httpx.AsyncClient(timeout=10.0)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "control_plane": CONTROL_PLANE_URL,
        "realtime_server": REALTIME_SERVER_URL
    }


@app.post("/auth/publish")
async def auth_publish(request: Request):
    """
    Authenticate stream publishing request
    Validates stream key against Control Plane API
    """
    try:
        form_data = await request.form()
        stream_key = form_data.get("name", "")
        client_ip = form_data.get("addr", "")
        app_name = form_data.get("app", "")
        
        logger.info(f"[PUBLISH AUTH] Stream: {stream_key}, IP: {client_ip}, App: {app_name}")
        
        # Call Control Plane to validate stream key
        try:
            response = await http_client.post(
                f"{CONTROL_PLANE_URL}/streams/validate",
                json={
                    "stream_key": stream_key,
                    "app_name": app_name,
                    "client_ip": client_ip
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                stream_id = data.get("stream_id")
                app_id = data.get("app_id")
                
                logger.info(f"[PUBLISH ALLOWED] Stream: {stream_key}, ID: {stream_id}")
                
                # Notify Real-Time Server
                asyncio.create_task(
                    notify_stream_event(stream_id, app_id, "stream.live", {
                        "stream_key": stream_key,
                        "client_ip": client_ip
                    })
                )
                
                return JSONResponse(
                    status_code=status.HTTP_200_OK,
                    content={"status": "allowed", "stream_id": stream_id}
                )
            else:
                logger.warning(f"[PUBLISH DENIED] Invalid stream key: {stream_key}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Invalid stream key"
                )
        
        except httpx.HTTPError as e:
            logger.error(f"Error connecting to Control Plane: {str(e)}")
            # Fallback: deny by default
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Control Plane unavailable"
            )
    
    except Exception as e:
        logger.error(f"Error in publish auth: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.post("/auth/publish_done")
async def auth_publish_done(request: Request):
    """
    Handle stream end event
    """
    try:
        form_data = await request.form()
        stream_key = form_data.get("name", "")
        
        logger.info(f"[PUBLISH ENDED] Stream: {stream_key}")
        
        # Update stream status in Control Plane
        try:
            response = await http_client.post(
                f"{CONTROL_PLANE_URL}/streams/end",
                json={"stream_key": stream_key}
            )
            
            if response.status_code == 200:
                data = response.json()
                stream_id = data.get("stream_id")
                app_id = data.get("app_id")
                duration = data.get("duration", 0)
                
                # Notify Real-Time Server
                asyncio.create_task(
                    notify_stream_event(stream_id, app_id, "stream.offline", {
                        "duration": duration
                    })
                )
                
                logger.info(f"[STREAM ENDED] ID: {stream_id}, Duration: {duration}s")
        
        except httpx.HTTPError as e:
            logger.error(f"Error updating stream status: {str(e)}")
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"status": "recorded"}
        )
    
    except Exception as e:
        logger.error(f"Error in publish_done: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"status": "error"}
        )


@app.post("/auth/play")
async def auth_play(request: Request):
    """
    Authenticate playback request
    Can be used for access control
    """
    try:
        form_data = await request.form()
        stream_key = form_data.get("name", "")
        client_ip = form_data.get("addr", "")
        
        logger.info(f"[PLAY] Stream: {stream_key}, IP: {client_ip}")
        
        # For now, allow all playback
        # In production, validate playback tokens here
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"status": "allowed"}
        )
    
    except Exception as e:
        logger.error(f"Error in play auth: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.post("/auth/play_done")
async def auth_play_done(request: Request):
    """
    Handle viewer disconnect
    """
    try:
        form_data = await request.form()
        stream_key = form_data.get("name", "")
        
        logger.info(f"[PLAY ENDED] Stream: {stream_key}")
        
        # Update viewer count
        # In production, decrement viewer count in Redis
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"status": "recorded"}
        )
    
    except Exception as e:
        logger.error(f"Error in play_done: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"status": "error"}
        )


async def notify_stream_event(stream_id: str, app_id: str, event_type: str, data: dict):
    """
    Notify Real-Time Server and trigger webhooks
    """
    try:
        # Send to Real-Time Server
        await http_client.post(
            f"{REALTIME_SERVER_URL}/internal/stream-event",
            json={
                "stream_id": stream_id,
                "app_id": app_id,
                "event_type": event_type,
                "data": data,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
        # Trigger webhook dispatch
        await http_client.post(
            f"{CONTROL_PLANE_URL}/webhooks/dispatch",
            json={
                "app_id": app_id,
                "event_type": event_type,
                "stream_id": stream_id,
                "data": data
            }
        )
        
        logger.info(f"Stream event notified: {event_type} for {stream_id}")
    
    except Exception as e:
        logger.error(f"Error notifying stream event: {str(e)}")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "RealCast NGINX Integration",
        "version": "2.0.0",
        "status": "operational",
        "endpoints": {
            "health": "/health",
            "publish_auth": "/auth/publish",
            "publish_done": "/auth/publish_done",
            "play_auth": "/auth/play",
            "play_done": "/auth/play_done"
        }
    }


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await http_client.aclose()
