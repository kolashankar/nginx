"""
Monitoring Routes

API endpoints for health checks, metrics, and system monitoring
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
import logging
import os
import psutil
import redis
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/monitoring", tags=["monitoring"])

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Redis connection
redis_client = redis.from_url(os.environ.get('REDIS_URL', 'redis://localhost:6379'))


@router.get("/health")
async def detailed_health_check():
    """
    Comprehensive health check for all services
    """
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {}
    }
    
    # Check MongoDB
    try:
        await db.command("ping")
        health_status["services"]["mongodb"] = {
            "status": "healthy",
            "url": mongo_url.split("@")[-1] if "@" in mongo_url else "localhost"
        }
    except Exception as e:
        health_status["services"]["mongodb"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "degraded"
    
    # Check Redis
    try:
        redis_client.ping()
        health_status["services"]["redis"] = {
            "status": "healthy",
            "url": os.environ.get('REDIS_URL', 'redis://localhost:6379')
        }
    except Exception as e:
        health_status["services"]["redis"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "degraded"
    
    # System metrics
    health_status["system"] = {
        "cpu_percent": psutil.cpu_percent(interval=1),
        "memory_percent": psutil.virtual_memory().percent,
        "disk_percent": psutil.disk_usage('/').percent
    }
    
    return health_status


@router.get("/metrics")
async def get_metrics():
    """
    Get system and application metrics
    """
    try:
        # Get counts from database
        total_users = await db.users.count_documents({})
        total_apps = await db.apps.count_documents({})
        total_streams = await db.streams.count_documents({})
        total_recordings = await db.recordings.count_documents({})
        
        # Get active streams from Redis
        active_streams = 0
        try:
            active_streams_keys = redis_client.keys("stream:*:status")
            active_streams = len([k for k in active_streams_keys if redis_client.get(k) == b"live"])
        except:
            pass
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "database": {
                "total_users": total_users,
                "total_apps": total_apps,
                "total_streams": total_streams,
                "total_recordings": total_recordings
            },
            "realtime": {
                "active_streams": active_streams
            },
            "system": {
                "cpu_percent": psutil.cpu_percent(interval=1),
                "memory_percent": psutil.virtual_memory().percent,
                "memory_available_mb": psutil.virtual_memory().available / (1024 * 1024),
                "disk_percent": psutil.disk_usage('/').percent,
                "disk_available_gb": psutil.disk_usage('/').free / (1024 * 1024 * 1024)
            }
        }
    except Exception as e:
        logger.error(f"Error getting metrics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/alerts")
async def get_alerts():
    """
    Get system alerts and warnings
    """
    alerts = []
    
    # Check CPU usage
    cpu_percent = psutil.cpu_percent(interval=1)
    if cpu_percent > 80:
        alerts.append({
            "level": "warning",
            "type": "cpu",
            "message": f"High CPU usage: {cpu_percent}%"
        })
    
    # Check memory usage
    memory_percent = psutil.virtual_memory().percent
    if memory_percent > 80:
        alerts.append({
            "level": "warning",
            "type": "memory",
            "message": f"High memory usage: {memory_percent}%"
        })
    
    # Check disk usage
    disk_percent = psutil.disk_usage('/').percent
    if disk_percent > 80:
        alerts.append({
            "level": "warning",
            "type": "disk",
            "message": f"High disk usage: {disk_percent}%"
        })
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "alerts": alerts,
        "count": len(alerts)
    }


@router.get("/uptime")
async def get_uptime():
    """
    Get system uptime
    """
    boot_time = datetime.fromtimestamp(psutil.boot_time())
    uptime = datetime.utcnow() - boot_time
    
    return {
        "boot_time": boot_time.isoformat(),
        "uptime_seconds": int(uptime.total_seconds()),
        "uptime_formatted": str(uptime)
    }
