"""
Security Middleware

Implements IP whitelisting, DDoS protection, and security headers
"""

from fastapi import HTTPException, status, Request
from fastapi.responses import JSONResponse
import os
import logging
import hashlib
import hmac
from typing import List, Optional
import redis
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Redis client
redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))


class SecurityMiddleware:
    """
    Security middleware for IP whitelisting and DDoS protection
    """
    
    def __init__(self):
        self.enabled = os.getenv("SECURITY_ENABLED", "true").lower() == "true"
        self.ip_whitelist = self._load_ip_whitelist()
        self.ddos_threshold = int(os.getenv("DDOS_THRESHOLD", "100"))  # requests per 10 seconds
    
    def _load_ip_whitelist(self) -> List[str]:
        """
        Load IP whitelist from environment or database
        """
        whitelist_str = os.getenv("IP_WHITELIST", "")
        if whitelist_str:
            return [ip.strip() for ip in whitelist_str.split(",")]
        return []
    
    async def check_ip_whitelist(self, ip: str, endpoint: str) -> bool:
        """
        Check if IP is whitelisted for specific endpoint
        Only applies to webhook endpoints
        """
        if not self.enabled:
            return True
        
        # Only apply whitelist to webhook endpoints
        if "/webhooks" not in endpoint:
            return True
        
        if not self.ip_whitelist:
            return True  # No whitelist configured
        
        if ip in self.ip_whitelist:
            return True
        
        logger.warning(f"IP not whitelisted: {ip} for endpoint {endpoint}")
        return False
    
    async def check_ddos_protection(self, ip: str) -> bool:
        """
        Check for potential DDoS attack from IP
        """
        try:
            key = f"ddos:{ip}:{int(datetime.utcnow().timestamp() / 10)}"
            count = redis_client.incr(key)
            
            if count == 1:
                redis_client.expire(key, 10)
            
            if count > self.ddos_threshold:
                logger.warning(f"Potential DDoS attack from {ip}: {count} requests in 10s")
                return False
            
            return True
        except Exception as e:
            logger.error(f"Error checking DDoS protection: {str(e)}")
            return True  # Fail open
    
    def verify_webhook_signature(self, payload: str, signature: str, secret: str) -> bool:
        """
        Verify webhook signature using HMAC
        """
        try:
            expected_signature = hmac.new(
                secret.encode(),
                payload.encode(),
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(signature, expected_signature)
        except Exception as e:
            logger.error(f"Error verifying webhook signature: {str(e)}")
            return False
    
    def add_security_headers(self, response: JSONResponse) -> JSONResponse:
        """
        Add security headers to response
        """
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        return response


# Global security middleware instance
security_middleware = SecurityMiddleware()


async def security_check(request: Request):
    """
    Middleware function for security checks
    """
    client_ip = request.client.host if request.client else "unknown"
    endpoint = request.url.path
    
    # Check IP whitelist
    if not await security_middleware.check_ip_whitelist(client_ip, endpoint):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="IP address not whitelisted"
        )
    
    # Check DDoS protection
    if not await security_middleware.check_ddos_protection(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
            headers={"Retry-After": "10"}
        )
