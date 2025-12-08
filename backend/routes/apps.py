from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from ..models.app import App, AppCreate, AppUpdate, AppResponse
from ..utils.jwt_handler import decode_access_token
from datetime import datetime, timezone

router = APIRouter(prefix="/apps", tags=["Apps"])
security = HTTPBearer()

def get_db():
    from ..server import db
    return db

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Get current user ID from JWT token"""
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    return payload["user_id"]

@router.post("/", response_model=AppResponse, status_code=status.HTTP_201_CREATED)
async def create_app(
    app_data: AppCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Create a new app for the authenticated user
    """
    app = App(
        user_id=user_id,
        name=app_data.name,
        description=app_data.description,
        settings=app_data.settings or {}
    )
    
    app_dict = app.model_dump()
    app_dict['created_at'] = app_dict['created_at'].isoformat()
    app_dict['updated_at'] = app_dict['updated_at'].isoformat()
    
    await db.apps.insert_one(app_dict)
    
    return AppResponse(
        id=app.id,
        name=app.name,
        description=app.description,
        is_active=app.is_active,
        created_at=app.created_at,
        updated_at=app.updated_at
    )

@router.get("/", response_model=List[AppResponse])
async def get_user_apps(
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get all apps for the authenticated user
    """
    apps = await db.apps.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    return [
        AppResponse(
            id=app["id"],
            name=app["name"],
            description=app.get("description"),
            is_active=app.get("is_active", True),
            created_at=datetime.fromisoformat(app["created_at"]),
            updated_at=datetime.fromisoformat(app["updated_at"])
        )
        for app in apps
    ]

@router.get("/{app_id}", response_model=AppResponse)
async def get_app(
    app_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get a specific app
    """
    app = await db.apps.find_one({"id": app_id, "user_id": user_id}, {"_id": 0})
    
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found"
        )
    
    return AppResponse(
        id=app["id"],
        name=app["name"],
        description=app.get("description"),
        is_active=app.get("is_active", True),
        created_at=datetime.fromisoformat(app["created_at"]),
        updated_at=datetime.fromisoformat(app["updated_at"])
    )

@router.put("/{app_id}", response_model=AppResponse)
async def update_app(
    app_id: str,
    app_data: AppUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Update an app
    """
    # Check if app exists and belongs to user
    app = await db.apps.find_one({"id": app_id, "user_id": user_id})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found"
        )
    
    # Update fields
    update_data = {k: v for k, v in app_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.apps.update_one(
        {"id": app_id},
        {"$set": update_data}
    )
    
    # Fetch updated app
    updated_app = await db.apps.find_one({"id": app_id}, {"_id": 0})
    
    return AppResponse(
        id=updated_app["id"],
        name=updated_app["name"],
        description=updated_app.get("description"),
        is_active=updated_app.get("is_active", True),
        created_at=datetime.fromisoformat(updated_app["created_at"]),
        updated_at=datetime.fromisoformat(updated_app["updated_at"])
    )

@router.delete("/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_app(
    app_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Delete an app
    """
    result = await db.apps.delete_one({"id": app_id, "user_id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="App not found"
        )
    
    return None
