"""
Advanced Analytics Routes

API endpoints for detailed analytics, metrics, and reporting
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
import logging
import os
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import redis

from middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["analytics"])

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Redis connection
redis_client = redis.from_url(os.environ.get('REDIS_URL', 'redis://localhost:6379'))


@router.get("/app/{app_id}/overview")
async def get_app_analytics_overview(
    app_id: str,
    days: int = Query(default=7, ge=1, le=90),
    current_user: dict = Depends(get_current_user)
):
    """
    Get comprehensive analytics overview for an app
    """
    # Verify app ownership
    app = await db.apps.find_one({"id": app_id, "user_id": current_user["id"]})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found or access denied"
        )
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get stream statistics
    streams = await db.streams.find({
        "app_id": app_id,
        "created_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(1000)
    
    total_streams = len(streams)
    total_duration = sum([s.get("duration", 0) for s in streams])
    avg_duration = total_duration / total_streams if total_streams > 0 else 0
    
    # Get viewer statistics
    total_views = sum([s.get("peak_viewers", 0) for s in streams])
    avg_viewers = total_views / total_streams if total_streams > 0 else 0
    
    # Get recording statistics
    recordings = await db.recordings.find({
        "app_id": app_id,
        "created_at": {"$gte": start_date.isoformat()}
    }).to_list(1000)
    
    total_recordings = len(recordings)
    total_recording_size = sum([r.get("file_size", 0) for r in recordings])
    
    # Get webhook statistics
    webhook_deliveries = await db.webhook_deliveries.count_documents({
        "app_id": app_id,
        "created_at": {"$gte": start_date.isoformat()}
    })
    
    webhook_failures = await db.webhook_deliveries.count_documents({
        "app_id": app_id,
        "status": "failed",
        "created_at": {"$gte": start_date.isoformat()}
    })
    
    return {
        "app_id": app_id,
        "period_days": days,
        "streams": {
            "total": total_streams,
            "total_duration_seconds": total_duration,
            "average_duration_seconds": avg_duration
        },
        "viewers": {
            "total_views": total_views,
            "average_concurrent": avg_viewers
        },
        "recordings": {
            "total": total_recordings,
            "total_size_bytes": total_recording_size,
            "total_size_gb": round(total_recording_size / (1024**3), 2)
        },
        "webhooks": {
            "total_deliveries": webhook_deliveries,
            "failed_deliveries": webhook_failures,
            "success_rate": round((webhook_deliveries - webhook_failures) / webhook_deliveries * 100, 2) if webhook_deliveries > 0 else 0
        }
    }


@router.get("/app/{app_id}/streams/timeline")
async def get_streams_timeline(
    app_id: str,
    days: int = Query(default=30, ge=1, le=90),
    current_user: dict = Depends(get_current_user)
):
    """
    Get daily stream statistics over time
    """
    # Verify app ownership
    app = await db.apps.find_one({"id": app_id, "user_id": current_user["id"]})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found or access denied"
        )
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Aggregate streams by day
    pipeline = [
        {
            "$match": {
                "app_id": app_id,
                "created_at": {"$gte": start_date.isoformat()}
            }
        },
        {
            "$group": {
                "_id": {"$substr": ["$created_at", 0, 10]},
                "count": {"$sum": 1},
                "total_duration": {"$sum": "$duration"},
                "total_viewers": {"$sum": "$peak_viewers"}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    daily_stats = await db.streams.aggregate(pipeline).to_list(None)
    
    return {
        "app_id": app_id,
        "period_days": days,
        "timeline": [
            {
                "date": stat["_id"],
                "streams": stat["count"],
                "total_duration": stat["total_duration"],
                "total_viewers": stat["total_viewers"]
            }
            for stat in daily_stats
        ]
    }


@router.get("/app/{app_id}/bandwidth")
async def get_bandwidth_usage(
    app_id: str,
    days: int = Query(default=7, ge=1, le=90),
    current_user: dict = Depends(get_current_user)
):
    """
    Get bandwidth usage statistics
    """
    # Verify app ownership
    app = await db.apps.find_one({"id": app_id, "user_id": current_user["id"]})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found or access denied"
        )
    
    # Mock bandwidth calculation
    # In production, this would be calculated from CDN logs or stream metrics
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    streams = await db.streams.find({
        "app_id": app_id,
        "created_at": {"$gte": start_date.isoformat()}
    }).to_list(1000)
    
    # Estimate: 5 Mbps average bitrate * duration * viewers
    total_bandwidth_gb = 0
    for stream in streams:
        duration_hours = stream.get("duration", 0) / 3600
        viewers = stream.get("peak_viewers", 0)
        # 5 Mbps = 0.625 MB/s = 2.25 GB/hour per viewer
        bandwidth_gb = duration_hours * viewers * 2.25
        total_bandwidth_gb += bandwidth_gb
    
    return {
        "app_id": app_id,
        "period_days": days,
        "total_bandwidth_gb": round(total_bandwidth_gb, 2),
        "total_bandwidth_tb": round(total_bandwidth_gb / 1024, 2),
        "estimated_cost_usd": round(total_bandwidth_gb * 0.10, 2)  # $0.10 per GB
    }


@router.get("/app/{app_id}/chat/stats")
async def get_chat_statistics(
    app_id: str,
    days: int = Query(default=7, ge=1, le=90),
    current_user: dict = Depends(get_current_user)
):
    """
    Get chat activity statistics
    """
    # Verify app ownership
    app = await db.apps.find_one({"id": app_id, "user_id": current_user["id"]})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found or access denied"
        )
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get chat messages from realtime database
    # This assumes messages are stored in MongoDB
    total_messages = await db.chat_messages.count_documents({
        "app_id": app_id,
        "created_at": {"$gte": start_date.isoformat()}
    })
    
    # Get unique users who sent messages
    unique_users = await db.chat_messages.distinct(
        "user_id",
        {
            "app_id": app_id,
            "created_at": {"$gte": start_date.isoformat()}
        }
    )
    
    return {
        "app_id": app_id,
        "period_days": days,
        "total_messages": total_messages,
        "unique_users": len(unique_users),
        "average_messages_per_user": round(total_messages / len(unique_users), 2) if len(unique_users) > 0 else 0
    }


@router.get("/app/{app_id}/export")
async def export_analytics(
    app_id: str,
    format: str = Query(default="json", regex="^(json|csv)$"),
    days: int = Query(default=30, ge=1, le=90),
    current_user: dict = Depends(get_current_user)
):
    """
    Export analytics data in JSON or CSV format
    """
    # Verify app ownership
    app = await db.apps.find_one({"id": app_id, "user_id": current_user["id"]})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found or access denied"
        )
    
    # Get all analytics data
    overview = await get_app_analytics_overview(app_id, days, current_user)
    timeline = await get_streams_timeline(app_id, days, current_user)
    bandwidth = await get_bandwidth_usage(app_id, days, current_user)
    
    export_data = {
        "app_id": app_id,
        "app_name": app.get("name"),
        "exported_at": datetime.utcnow().isoformat(),
        "period_days": days,
        "overview": overview,
        "timeline": timeline,
        "bandwidth": bandwidth
    }
    
    if format == "json":
        return export_data
    else:
        # CSV format would be implemented here
        return {"message": "CSV export not yet implemented", "data": export_data}
