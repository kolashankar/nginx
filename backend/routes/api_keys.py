from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from models.api_key import ApiKey, ApiKeyCreate, ApiKeyResponse
from utils.jwt_handler import decode_access_token
from datetime import datetime

router = APIRouter(prefix="/api-keys", tags=["API Keys"])
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

@router.post("/", response_model=ApiKeyResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    key_data: ApiKeyCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Create a new API key for an app
    """
    # Verify app belongs to user
    app = await db.apps.find_one({"id": key_data.app_id, "user_id": user_id})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found"
        )
    
    api_key = ApiKey(
        app_id=key_data.app_id,
        name=key_data.name
    )
    
    key_dict = api_key.model_dump()
    key_dict['created_at'] = key_dict['created_at'].isoformat()
    if key_dict.get('last_used'):
        key_dict['last_used'] = key_dict['last_used'].isoformat()
    
    await db.api_keys.insert_one(key_dict)
    
    return ApiKeyResponse(
        id=api_key.id,
        app_id=api_key.app_id,
        key=api_key.key,
        secret=api_key.secret,
        name=api_key.name,
        is_active=api_key.is_active,
        created_at=api_key.created_at,
        last_used=api_key.last_used
    )

@router.get("/", response_model=List[ApiKeyResponse])
async def get_api_keys(
    app_id: str = None,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get all API keys for user's apps
    """
    if app_id:
        # Verify app belongs to user
        app = await db.apps.find_one({"id": app_id, "user_id": user_id})
        if not app:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="App not found"
            )
        keys = await db.api_keys.find({"app_id": app_id}, {"_id": 0}).to_list(100)
    else:
        # Get all apps for user
        apps = await db.apps.find({"user_id": user_id}, {"_id": 0}).to_list(100)
        app_ids = [app["id"] for app in apps]
        keys = await db.api_keys.find({"app_id": {"$in": app_ids}}, {"_id": 0}).to_list(100)
    
    return [
        ApiKeyResponse(
            id=k["id"],
            app_id=k["app_id"],
            key=k["key"],
            secret=k["secret"],
            name=k.get("name"),
            is_active=k.get("is_active", True),
            created_at=datetime.fromisoformat(k["created_at"]),
            last_used=datetime.fromisoformat(k["last_used"]) if k.get("last_used") else None
        )
        for k in keys
    ]

@router.get("/{key_id}", response_model=ApiKeyResponse)
async def get_api_key(
    key_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get a specific API key
    """
    key = await db.api_keys.find_one({"id": key_id}, {"_id": 0})
    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    # Verify user owns the app
    app = await db.apps.find_one({"id": key["app_id"], "user_id": user_id})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return ApiKeyResponse(
        id=key["id"],
        app_id=key["app_id"],
        key=key["key"],
        secret=key["secret"],
        name=key.get("name"),
        is_active=key.get("is_active", True),
        created_at=datetime.fromisoformat(key["created_at"]),
        last_used=datetime.fromisoformat(key["last_used"]) if key.get("last_used") else None
    )

@router.post("/{key_id}/regenerate", response_model=ApiKeyResponse)
async def regenerate_api_key(
    key_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Regenerate an API key (creates new secret)
    """
    import secrets
    
    key = await db.api_keys.find_one({"id": key_id})
    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    # Verify user owns the app
    app = await db.apps.find_one({"id": key["app_id"], "user_id": user_id})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Generate new secret
    new_secret = f"sk_{secrets.token_urlsafe(48)}"
    
    await db.api_keys.update_one(
        {"id": key_id},
        {"$set": {"secret": new_secret}}
    )
    
    # Fetch updated key
    updated_key = await db.api_keys.find_one({"id": key_id}, {"_id": 0})
    
    return ApiKeyResponse(
        id=updated_key["id"],
        app_id=updated_key["app_id"],
        key=updated_key["key"],
        secret=updated_key["secret"],
        name=updated_key.get("name"),
        is_active=updated_key.get("is_active", True),
        created_at=datetime.fromisoformat(updated_key["created_at"]),
        last_used=datetime.fromisoformat(updated_key["last_used"]) if updated_key.get("last_used") else None
    )

@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    key_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Delete an API key
    """
    key = await db.api_keys.find_one({"id": key_id})
    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    # Verify user owns the app
    app = await db.apps.find_one({"id": key["app_id"], "user_id": user_id})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    await db.api_keys.delete_one({"id": key_id})
    return None
