"""
Audit Logs Routes

API endpoints for viewing audit logs and security events
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from typing import List, Optional
import logging
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta

from models.audit_log import AuditLog, AuditLogCreate
from middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/audit-logs", tags=["audit"])

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


async def create_audit_log(
    user_id: Optional[str],
    app_id: Optional[str],
    action: str,
    resource_type: str,
    resource_id: Optional[str],
    status: str,
    request: Request,
    details: Optional[dict] = None
) -> AuditLog:
    """
    Helper function to create audit log entries
    """
    try:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        log_data = AuditLogCreate(
            user_id=user_id,
            app_id=app_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent=user_agent,
            status=status,
            details=details or {}
        )
        
        log_obj = AuditLog(**log_data.model_dump())
        log_dict = log_obj.model_dump()
        log_dict['timestamp'] = log_dict['timestamp'].isoformat()
        
        await db.audit_logs.insert_one(log_dict)
        
        return log_obj
    
    except Exception as e:
        logger.error(f"Error creating audit log: {str(e)}")
        return None


@router.get("/", response_model=List[AuditLog])
async def list_audit_logs(
    app_id: Optional[str] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    status: Optional[str] = None,
    days: int = Query(7, le=90),
    limit: int = Query(100, le=1000),
    skip: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """
    List audit logs with filters
    """
    # Build query filter
    query_filter = {
        "user_id": current_user["id"]
    }
    
    # Add optional filters
    if app_id:
        # Verify app ownership
        app = await db.apps.find_one({"id": app_id, "user_id": current_user["id"]})
        if not app:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="App not found or access denied"
            )
        query_filter["app_id"] = app_id
    
    if action:
        query_filter["action"] = action
    
    if resource_type:
        query_filter["resource_type"] = resource_type
    
    if status:
        query_filter["status"] = status
    
    # Date filter
    start_date = datetime.utcnow() - timedelta(days=days)
    query_filter["timestamp"] = {"$gte": start_date.isoformat()}
    
    # Query logs
    logs = await db.audit_logs.find(
        query_filter,
        {"_id": 0}
    ).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    
    # Convert ISO strings back to datetime
    for log in logs:
        if isinstance(log.get('timestamp'), str):
            log['timestamp'] = datetime.fromisoformat(log['timestamp'])
    
    return logs


@router.get("/stats")
async def get_audit_stats(
    app_id: Optional[str] = None,
    days: int = Query(7, le=90),
    current_user: dict = Depends(get_current_user)
):
    """
    Get audit log statistics
    """
    # Build query filter
    query_filter = {
        "user_id": current_user["id"]
    }
    
    if app_id:
        # Verify app ownership
        app = await db.apps.find_one({"id": app_id, "user_id": current_user["id"]})
        if not app:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="App not found or access denied"
            )
        query_filter["app_id"] = app_id
    
    # Date filter
    start_date = datetime.utcnow() - timedelta(days=days)
    query_filter["timestamp"] = {"$gte": start_date.isoformat()}
    
    # Get statistics
    total_actions = await db.audit_logs.count_documents(query_filter)
    
    # Count by status
    success_count = await db.audit_logs.count_documents(
        {**query_filter, "status": "success"}
    )
    failure_count = await db.audit_logs.count_documents(
        {**query_filter, "status": "failure"}
    )
    denied_count = await db.audit_logs.count_documents(
        {**query_filter, "status": "denied"}
    )
    
    # Get most common actions
    pipeline = [
        {"$match": query_filter},
        {"$group": {"_id": "$action", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    
    common_actions = []
    async for doc in db.audit_logs.aggregate(pipeline):
        common_actions.append({
            "action": doc["_id"],
            "count": doc["count"]
        })
    
    return {
        "total_actions": total_actions,
        "success_count": success_count,
        "failure_count": failure_count,
        "denied_count": denied_count,
        "common_actions": common_actions,
        "period_days": days
    }


@router.get("/security-events")
async def get_security_events(
    days: int = Query(7, le=90),
    limit: int = Query(100, le=1000),
    current_user: dict = Depends(get_current_user)
):
    """
    Get security-related events (failures, denials)
    """
    # Query for failed and denied actions
    start_date = datetime.utcnow() - timedelta(days=days)
    
    query_filter = {
        "user_id": current_user["id"],
        "status": {"$in": ["failure", "denied"]},
        "timestamp": {"$gte": start_date.isoformat()}
    }
    
    events = await db.audit_logs.find(
        query_filter,
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    # Convert ISO strings back to datetime
    for event in events:
        if isinstance(event.get('timestamp'), str):
            event['timestamp'] = datetime.fromisoformat(event['timestamp'])
    
    return {
        "total_events": len(events),
        "events": events
    }


@router.delete("/cleanup")
async def cleanup_old_logs(
    days: int = Query(90, ge=30),
    current_user: dict = Depends(get_current_user)
):
    """
    Delete audit logs older than specified days
    """
    # Only allow cleanup for own logs
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    result = await db.audit_logs.delete_many({
        "user_id": current_user["id"],
        "timestamp": {"$lt": cutoff_date.isoformat()}
    })
    
    logger.info(f"Cleaned up {result.deleted_count} audit logs older than {days} days")
    
    return {
        "message": f"Deleted {result.deleted_count} old audit log entries",
        "deleted_count": result.deleted_count
    }
