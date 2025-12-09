"""
Rate Limiter Middleware

Implements rate limiting per API key and IP address
"""

from fastapi import HTTPException, status, Request
from datetime import datetime, timedelta
import redis
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Redis client for rate limiting
redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))


class RateLimiter:
    """
    Rate limiter using sliding window algorithm
    """
    
    def __init__(self, requests_per_minute: int = 60, requests_per_hour: int = 1000):
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
    
    async def check_rate_limit(self, identifier: str, endpoint: str = "global") -> bool:
        """
        Check if request is within rate limit
        
        Args:
            identifier: API key or IP address
            endpoint: Specific endpoint being accessed
        
        Returns:
            True if within limit, raises HTTPException if exceeded
        """
        try:
            now = datetime.utcnow()
            minute_key = f"ratelimit:{identifier}:{endpoint}:minute:{now.strftime('%Y%m%d%H%M')}"
            hour_key = f"ratelimit:{identifier}:{endpoint}:hour:{now.strftime('%Y%m%d%H')}"
            
            # Check minute limit
            minute_count = redis_client.incr(minute_key)
            if minute_count == 1:
                redis_client.expire(minute_key, 60)
            
            if minute_count > self.requests_per_minute:
                logger.warning(f"Rate limit exceeded for {identifier}: {minute_count} requests/minute")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded: {self.requests_per_minute} requests per minute",
                    headers={"Retry-After": "60"}
                )
            
            # Check hour limit
            hour_count = redis_client.incr(hour_key)
            if hour_count == 1:
                redis_client.expire(hour_key, 3600)
            
            if hour_count > self.requests_per_hour:
                logger.warning(f"Rate limit exceeded for {identifier}: {hour_count} requests/hour")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded: {self.requests_per_hour} requests per hour",
                    headers={"Retry-After": "3600"}
                )
            
            return True
        
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error checking rate limit: {str(e)}")
            # Fail open - don't block requests if Redis is down
            return True
    
    def get_rate_limit_info(self, identifier: str, endpoint: str = "global") -> dict:
        """
        Get current rate limit usage
        """
        try:
            now = datetime.utcnow()
            minute_key = f"ratelimit:{identifier}:{endpoint}:minute:{now.strftime('%Y%m%d%H%M')}"
            hour_key = f"ratelimit:{identifier}:{endpoint}:hour:{now.strftime('%Y%m%d%H')}"
            
            minute_count = int(redis_client.get(minute_key) or 0)
            hour_count = int(redis_client.get(hour_key) or 0)
            
            return {
                "requests_per_minute": {
                    "limit": self.requests_per_minute,
                    "current": minute_count,
                    "remaining": max(0, self.requests_per_minute - minute_count)
                },
                "requests_per_hour": {
                    "limit": self.requests_per_hour,
                    "current": hour_count,
                    "remaining": max(0, self.requests_per_hour - hour_count)
                }
            }
        except Exception as e:
            logger.error(f"Error getting rate limit info: {str(e)}")
            return {}


# Global rate limiter instance
rate_limiter = RateLimiter()


async def rate_limit_middleware(request: Request, identifier: Optional[str] = None):
    """
    Middleware function to apply rate limiting
    """
    # Use API key if available, otherwise use IP address
    if not identifier:
        identifier = request.client.host if request.client else "unknown"
    
    endpoint = request.url.path
    await rate_limiter.check_rate_limit(identifier, endpoint)
