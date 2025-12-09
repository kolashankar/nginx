"""
Rate Limiter Middleware

Implements rate limiting per API key and IP address using Redis
"""

import logging
from fastapi import Request, HTTPException, status
from typing import Optional
import time
import hashlib

from utils.redis_client import redis_client

logger = logging.getLogger(__name__)


class RateLimiter:
    """
    Rate limiter using Redis
    """
    
    def __init__(self, requests_per_minute: int = 60, requests_per_hour: int = 1000):
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
    
    async def check_rate_limit(self, identifier: str, request: Request) -> bool:
        """
        Check if request is within rate limits
        
        Args:
            identifier: API key or IP address
            request: FastAPI request object
        
        Returns:
            True if allowed, raises HTTPException if rate limited
        """
        try:
            # Create unique key for this identifier
            key_minute = f"ratelimit:minute:{identifier}"
            key_hour = f"ratelimit:hour:{identifier}"
            
            # Check minute limit
            minute_count = await redis_client.get(key_minute)
            if minute_count and int(minute_count) >= self.requests_per_minute:
                logger.warning(f"Rate limit exceeded (minute): {identifier}")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Maximum {self.requests_per_minute} requests per minute.",
                    headers={"Retry-After": "60"}
                )
            
            # Check hour limit
            hour_count = await redis_client.get(key_hour)
            if hour_count and int(hour_count) >= self.requests_per_hour:
                logger.warning(f"Rate limit exceeded (hour): {identifier}")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Maximum {self.requests_per_hour} requests per hour.",
                    headers={"Retry-After": "3600"}
                )
            
            # Increment counters
            await redis_client.incr(key_minute)
            await redis_client.expire(key_minute, 60)  # Expire after 1 minute
            
            await redis_client.incr(key_hour)
            await redis_client.expire(key_hour, 3600)  # Expire after 1 hour
            
            return True
        
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error checking rate limit: {str(e)}")
            # Allow request if rate limiting fails
            return True
    
    async def get_rate_limit_status(self, identifier: str) -> dict:
        """
        Get current rate limit status for an identifier
        """
        try:
            key_minute = f"ratelimit:minute:{identifier}"
            key_hour = f"ratelimit:hour:{identifier}"
            
            minute_count = await redis_client.get(key_minute) or 0
            hour_count = await redis_client.get(key_hour) or 0
            
            return {
                "requests_this_minute": int(minute_count),
                "requests_this_hour": int(hour_count),
                "limit_per_minute": self.requests_per_minute,
                "limit_per_hour": self.requests_per_hour,
                "remaining_minute": max(0, self.requests_per_minute - int(minute_count)),
                "remaining_hour": max(0, self.requests_per_hour - int(hour_count))
            }
        except Exception as e:
            logger.error(f"Error getting rate limit status: {str(e)}")
            return {}


# Global rate limiter instances
api_rate_limiter = RateLimiter(requests_per_minute=60, requests_per_hour=1000)
stream_rate_limiter = RateLimiter(requests_per_minute=10, requests_per_hour=100)


async def rate_limit_middleware(request: Request, call_next):
    """
    Middleware to apply rate limiting to all requests
    """
    try:
        # Get identifier (API key or IP)
        api_key = request.headers.get("X-API-Key")
        if api_key:
            identifier = hashlib.sha256(api_key.encode()).hexdigest()[:16]
        else:
            # Use IP address
            identifier = request.client.host if request.client else "unknown"
        
        # Check rate limit
        await api_rate_limiter.check_rate_limit(identifier, request)
        
        # Continue with request
        response = await call_next(request)
        return response
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in rate limit middleware: {str(e)}")
        response = await call_next(request)
        return response
