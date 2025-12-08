import redis
import json
import os
from typing import Optional, Any

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    redis_client.ping()
    print("✓ Redis connected successfully")
except Exception as e:
    print(f"✗ Redis connection failed: {e}")
    redis_client = None

def get_cache(key: str) -> Optional[Any]:
    """Get value from Redis cache"""
    if not redis_client:
        return None
    try:
        value = redis_client.get(key)
        if value:
            return json.loads(value)
        return None
    except Exception as e:
        print(f"Redis GET error: {e}")
        return None

def set_cache(key: str, value: Any, expire: int = 3600) -> bool:
    """Set value in Redis cache with expiration (seconds)"""
    if not redis_client:
        return False
    try:
        redis_client.setex(key, expire, json.dumps(value))
        return True
    except Exception as e:
        print(f"Redis SET error: {e}")
        return False

def delete_cache(key: str) -> bool:
    """Delete key from Redis"""
    if not redis_client:
        return False
    try:
        redis_client.delete(key)
        return True
    except Exception as e:
        print(f"Redis DELETE error: {e}")
        return False

def increment_counter(key: str, amount: int = 1) -> int:
    """Increment a counter in Redis"""
    if not redis_client:
        return 0
    try:
        return redis_client.incrby(key, amount)
    except Exception as e:
        print(f"Redis INCR error: {e}")
        return 0

def get_stream_viewers(stream_key: str) -> int:
    """Get current viewer count for a stream"""
    count = get_cache(f"stream:viewers:{stream_key}")
    return count if count else 0

def set_stream_viewers(stream_key: str, count: int) -> bool:
    """Set viewer count for a stream"""
    return set_cache(f"stream:viewers:{stream_key}", count, expire=60)

def mark_stream_live(stream_key: str, app_id: str) -> bool:
    """Mark a stream as live"""
    return set_cache(f"stream:live:{stream_key}", {"app_id": app_id, "live": True}, expire=7200)

def mark_stream_offline(stream_key: str) -> bool:
    """Mark a stream as offline"""
    return delete_cache(f"stream:live:{stream_key}")

def is_stream_live(stream_key: str) -> bool:
    """Check if a stream is currently live"""
    data = get_cache(f"stream:live:{stream_key}")
    return data.get("live", False) if data else False
