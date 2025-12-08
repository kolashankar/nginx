import httpx
import hmac
import hashlib
import json
from typing import Dict, Any, List
from datetime import datetime
import asyncio
import logging

logger = logging.getLogger(__name__)

class WebhookDispatcher:
    """
    Universal webhook dispatcher with retry logic
    """
    
    def __init__(self, max_retries: int = 3, timeout: int = 10):
        self.max_retries = max_retries
        self.timeout = timeout
        self.client = httpx.AsyncClient(timeout=timeout)
    
    def create_signature(self, payload: Dict[str, Any], secret: str) -> str:
        """
        Create HMAC SHA256 signature for webhook payload
        """
        payload_bytes = json.dumps(payload, sort_keys=True).encode('utf-8')
        signature = hmac.new(
            secret.encode('utf-8'),
            payload_bytes,
            hashlib.sha256
        ).hexdigest()
        return signature
    
    async def dispatch_event(
        self,
        webhook_url: str,
        event_type: str,
        payload: Dict[str, Any],
        secret: str = None
    ) -> Dict[str, Any]:
        """
        Dispatch a single event to a webhook URL with retry logic
        """
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "RealCast-Webhook/1.0",
            "X-RealCast-Event": event_type,
            "X-RealCast-Timestamp": datetime.utcnow().isoformat()
        }
        
        # Add HMAC signature if secret is provided
        if secret:
            signature = self.create_signature(payload, secret)
            headers["X-RealCast-Signature"] = f"sha256={signature}"
        
        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info(f"[WEBHOOK] Dispatching {event_type} to {webhook_url} (attempt {attempt})")
                
                response = await self.client.post(
                    webhook_url,
                    json=payload,
                    headers=headers
                )
                
                if response.status_code in [200, 201, 202, 204]:
                    logger.info(f"[WEBHOOK] Successfully delivered {event_type} to {webhook_url}")
                    return {
                        "delivered": True,
                        "status_code": response.status_code,
                        "response_body": response.text[:500],  # Limit response body
                        "attempt": attempt
                    }
                else:
                    logger.warning(
                        f"[WEBHOOK] Failed to deliver {event_type} to {webhook_url}. "
                        f"Status: {response.status_code}, Body: {response.text[:200]}"
                    )
                    
                    # Don't retry on 4xx errors (client errors)
                    if 400 <= response.status_code < 500:
                        return {
                            "delivered": False,
                            "status_code": response.status_code,
                            "error": f"Client error: {response.text[:200]}",
                            "attempt": attempt
                        }
            
            except httpx.TimeoutException:
                logger.warning(f"[WEBHOOK] Timeout delivering {event_type} to {webhook_url} (attempt {attempt})")
                if attempt == self.max_retries:
                    return {
                        "delivered": False,
                        "error": "Timeout after maximum retries",
                        "attempt": attempt
                    }
            
            except Exception as e:
                logger.error(f"[WEBHOOK] Error delivering {event_type} to {webhook_url}: {str(e)}")
                if attempt == self.max_retries:
                    return {
                        "delivered": False,
                        "error": str(e),
                        "attempt": attempt
                    }
            
            # Exponential backoff: 1s, 2s, 4s, 8s, etc.
            if attempt < self.max_retries:
                wait_time = 2 ** (attempt - 1)
                logger.info(f"[WEBHOOK] Retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
        
        return {
            "delivered": False,
            "error": "Maximum retries exceeded",
            "attempt": self.max_retries
        }
    
    async def dispatch_to_subscribers(
        self,
        event_type: str,
        payload: Dict[str, Any],
        webhooks: List[Dict[str, Any]]
    ):
        """
        Dispatch an event to all subscribed webhooks
        """
        tasks = []
        for webhook in webhooks:
            # Check if webhook is subscribed to this event
            if event_type in webhook.get("events", []) and webhook.get("is_active", True):
                task = self.dispatch_event(
                    webhook["url"],
                    event_type,
                    payload,
                    webhook.get("secret")
                )
                tasks.append(task)
        
        # Execute all webhooks concurrently
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            logger.info(f"[WEBHOOK] Dispatched {event_type} to {len(tasks)} webhooks")
            return results
        
        return []
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


# Global dispatcher instance
webhook_dispatcher = WebhookDispatcher()


async def dispatch_stream_event(
    db,
    app_id: str,
    event_type: str,
    stream_data: Dict[str, Any]
):
    """
    Dispatch a stream-related event to all webhooks configured for the app
    """
    # Get all webhooks for this app
    webhooks = await db.webhooks.find(
        {"app_id": app_id, "is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    if not webhooks:
        logger.info(f"[WEBHOOK] No active webhooks found for app {app_id}")
        return
    
    # Create event payload
    payload = {
        "event": event_type,
        "timestamp": datetime.utcnow().isoformat(),
        "app_id": app_id,
        "data": stream_data
    }
    
    # Dispatch to all subscribed webhooks
    results = await webhook_dispatcher.dispatch_to_subscribers(
        event_type,
        payload,
        webhooks
    )
    
    # Log results to database
    for i, result in enumerate(results):
        if isinstance(result, dict):
            log_entry = {
                "webhook_id": webhooks[i]["id"],
                "event_type": event_type,
                "payload": payload,
                "status_code": result.get("status_code"),
                "response_body": result.get("response_body"),
                "error": result.get("error"),
                "attempt": result.get("attempt", 1),
                "delivered": result.get("delivered", False),
                "created_at": datetime.utcnow().isoformat()
            }
            await db.webhook_logs.insert_one(log_entry)
