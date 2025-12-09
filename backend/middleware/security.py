"""
Security Middleware

Implements IP whitelisting, DDoS protection, and request validation
"""

import logging
from fastapi import Request, HTTPException, status
from typing import List, Optional
import hashlib
import hmac
import time

from utils.redis_client import redis_client

logger = logging.getLogger(__name__)


class SecurityMiddleware:
    """
    Security middleware for IP whitelisting and DDoS protection
    """
    
    def __init__(self):
        self.blocked_ips = set()
        self.suspicious_requests_threshold = 100  # requests per minute
    
    async def check_ip_whitelist(self, request: Request, whitelist: Optional[List[str]] = None) -> bool:
        """
        Check if request IP is in whitelist
        
        Args:
            request: FastAPI request
            whitelist: List of allowed IPs (None = allow all)
        
        Returns:
            True if allowed
        """
        if not whitelist:
            return True
        
        client_ip = request.client.host if request.client else "unknown"
        
        if client_ip not in whitelist:
            logger.warning(f"IP not in whitelist: {client_ip}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="IP address not allowed"
            )
        
        return True
    
    async def check_blocked_ip(self, request: Request) -> bool:
        """
        Check if IP is blocked due to suspicious activity
        """
        client_ip = request.client.host if request.client else "unknown"
        
        # Check Redis for blocked IPs
        is_blocked = await redis_client.get(f"blocked_ip:{client_ip}")
        
        if is_blocked:
            logger.warning(f"Blocked IP attempted access: {client_ip}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="IP address is blocked"
            )
        
        return True
    
    async def detect_suspicious_activity(self, request: Request) -> None:
        """
        Detect and block suspicious activity (DDoS protection)
        """
        try:
            client_ip = request.client.host if request.client else "unknown"
            key = f"suspicious:{client_ip}"
            
            # Increment request counter
            count = await redis_client.incr(key)
            await redis_client.expire(key, 60)  # 1 minute window
            
            # Block if threshold exceeded
            if count > self.suspicious_requests_threshold:
                logger.warning(f"Suspicious activity detected from {client_ip}: {count} requests/min")
                
                # Block IP for 1 hour
                await redis_client.setex(f"blocked_ip:{client_ip}", 3600, "1")
                
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests. IP temporarily blocked."
                )
        
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in suspicious activity detection: {str(e)}")
    
    async def validate_webhook_signature(self, request: Request, secret: str) -> bool:
        """
        Validate HMAC signature for webhook requests
        
        Args:
            request: FastAPI request
            secret: Webhook secret
        
        Returns:
            True if signature is valid
        """
        try:
            signature_header = request.headers.get("X-Webhook-Signature")
            if not signature_header:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Missing webhook signature"
                )
            
            body = await request.body()
            
            # Calculate expected signature
            expected_signature = hmac.new(
                secret.encode(),
                body,
                hashlib.sha256
            ).hexdigest()
            
            # Compare signatures
            if not hmac.compare_digest(signature_header, expected_signature):
                logger.warning("Invalid webhook signature")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid webhook signature"
                )
            
            return True
        
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error validating webhook signature: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error validating signature"
            )


# Global security middleware instance
security_middleware = SecurityMiddleware()


async def security_check_middleware(request: Request, call_next):
    """
    Apply security checks to all requests
    """
    try:
        # Check if IP is blocked
        await security_middleware.check_blocked_ip(request)
        
        # Detect suspicious activity
        await security_middleware.detect_suspicious_activity(request)
        
        # Continue with request
        response = await call_next(request)
        return response
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in security middleware: {str(e)}")
        response = await call_next(request)
        return response
