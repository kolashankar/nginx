from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from models.webhook import Webhook, WebhookCreate, WebhookUpdate, WebhookResponse
from utils.jwt_handler import decode_access_token
from datetime import datetime, timezone

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])
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

@router.post("/", response_model=WebhookResponse, status_code=status.HTTP_201_CREATED)
async def create_webhook(
    webhook_data: WebhookCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Create a new webhook for an app
    """
    # Verify app belongs to user
    app = await db.apps.find_one({"id": webhook_data.app_id, "user_id": user_id})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found"
        )
    
    webhook = Webhook(
        app_id=webhook_data.app_id,
        url=webhook_data.url,
        events=webhook_data.events,
        secret=webhook_data.secret
    )
    
    webhook_dict = webhook.model_dump()
    webhook_dict['created_at'] = webhook_dict['created_at'].isoformat()
    webhook_dict['updated_at'] = webhook_dict['updated_at'].isoformat()
    
    await db.webhooks.insert_one(webhook_dict)
    
    return WebhookResponse(
        id=webhook.id,
        app_id=webhook.app_id,
        url=webhook.url,
        events=webhook.events,
        is_active=webhook.is_active,
        created_at=webhook.created_at
    )

@router.get("/", response_model=List[WebhookResponse])
async def get_webhooks(
    app_id: str = None,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get all webhooks for user's apps
    """
    if app_id:
        # Verify app belongs to user
        app = await db.apps.find_one({"id": app_id, "user_id": user_id})
        if not app:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="App not found"
            )
        webhooks = await db.webhooks.find({"app_id": app_id}, {"_id": 0}).to_list(100)
    else:
        # Get all apps for user
        apps = await db.apps.find({"user_id": user_id}, {"_id": 0}).to_list(100)
        app_ids = [app["id"] for app in apps]
        webhooks = await db.webhooks.find({"app_id": {"$in": app_ids}}, {"_id": 0}).to_list(100)
    
    return [
        WebhookResponse(
            id=w["id"],
            app_id=w["app_id"],
            url=w["url"],
            events=w["events"],
            is_active=w.get("is_active", True),
            created_at=datetime.fromisoformat(w["created_at"])
        )
        for w in webhooks
    ]

@router.get("/{webhook_id}", response_model=WebhookResponse)
async def get_webhook(
    webhook_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get a specific webhook
    """
    webhook = await db.webhooks.find_one({"id": webhook_id}, {"_id": 0})
    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )
    
    # Verify user owns the app
    app = await db.apps.find_one({"id": webhook["app_id"], "user_id": user_id})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return WebhookResponse(
        id=webhook["id"],
        app_id=webhook["app_id"],
        url=webhook["url"],
        events=webhook["events"],
        is_active=webhook.get("is_active", True),
        created_at=datetime.fromisoformat(webhook["created_at"])
    )

@router.put("/{webhook_id}", response_model=WebhookResponse)
async def update_webhook(
    webhook_id: str,
    webhook_data: WebhookUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Update a webhook
    """
    webhook = await db.webhooks.find_one({"id": webhook_id})
    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )
    
    # Verify user owns the app
    app = await db.apps.find_one({"id": webhook["app_id"], "user_id": user_id})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update fields
    update_data = {k: v for k, v in webhook_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.webhooks.update_one(
        {"id": webhook_id},
        {"$set": update_data}
    )
    
    # Fetch updated webhook
    updated_webhook = await db.webhooks.find_one({"id": webhook_id}, {"_id": 0})
    
    return WebhookResponse(
        id=updated_webhook["id"],
        app_id=updated_webhook["app_id"],
        url=updated_webhook["url"],
        events=updated_webhook["events"],
        is_active=updated_webhook.get("is_active", True),
        created_at=datetime.fromisoformat(updated_webhook["created_at"])
    )

@router.delete("/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    webhook_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Delete a webhook
    """
    webhook = await db.webhooks.find_one({"id": webhook_id})
    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )
    
    # Verify user owns the app
    app = await db.apps.find_one({"id": webhook["app_id"], "user_id": user_id})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    await db.webhooks.delete_one({"id": webhook_id})
    return None
