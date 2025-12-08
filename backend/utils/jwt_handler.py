import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict
import os

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

def create_access_token(data: Dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[Dict]:
    """
    Decode and verify a JWT token
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def create_playback_token(stream_key: str, app_id: str, expires_minutes: int = 60) -> str:
    """
    Create a signed JWT token for HLS playback
    """
    data = {
        "stream_key": stream_key,
        "app_id": app_id,
        "type": "playback"
    }
    expires_delta = timedelta(minutes=expires_minutes)
    return create_access_token(data, expires_delta)

def verify_playback_token(token: str) -> Optional[Dict]:
    """
    Verify a playback token and return stream info
    """
    payload = decode_access_token(token)
    if payload and payload.get("type") == "playback":
        return payload
    return None
