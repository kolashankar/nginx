from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase
from ..models.user import User, UserCreate, UserLogin, UserResponse
from ..utils.password_handler import hash_password, verify_password
from ..utils.jwt_handler import create_access_token
from datetime import datetime, timezone

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

def get_db():
    from ..server import db
    return db

@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Register a new user
    """
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    user = User(
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        full_name=user_data.full_name
    )
    
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    user_dict['updated_at'] = user_dict['updated_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Create access token
    access_token = create_access_token(data={"user_id": user.id, "email": user.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at
        )
    }

@router.post("/login", response_model=dict)
async def login(credentials: UserLogin, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Login user and return JWT token
    """
    # Find user
    user_doc = await db.users.find_one({"email": credentials.email})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(credentials.password, user_doc["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if user is active
    if not user_doc.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )
    
    # Create access token
    access_token = create_access_token(data={"user_id": user_doc["id"], "email": user_doc["email"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=user_doc["id"],
            email=user_doc["email"],
            full_name=user_doc.get("full_name"),
            is_active=user_doc.get("is_active", True),
            is_verified=user_doc.get("is_verified", False),
            created_at=datetime.fromisoformat(user_doc["created_at"])
        )
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get current user info
    """
    from ..utils.jwt_handler import decode_access_token
    
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    user_doc = await db.users.find_one({"id": payload["user_id"]})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=user_doc["id"],
        email=user_doc["email"],
        full_name=user_doc.get("full_name"),
        is_active=user_doc.get("is_active", True),
        is_verified=user_doc.get("is_verified", False),
        created_at=datetime.fromisoformat(user_doc["created_at"])
    )
