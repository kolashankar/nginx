"""
Billing Routes

API endpoints for subscription management and payment processing
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
import logging
import os
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
import uuid

from middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing", tags=["billing"])

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Subscription tiers
SUBSCRIPTION_TIERS = {
    "free": {
        "name": "Free",
        "price_usd": 0,
        "max_streams": 1,
        "max_concurrent_viewers": 50,
        "bandwidth_gb": 100,
        "recording_enabled": False,
        "features": ["Basic streaming", "Chat support", "Community support"]
    },
    "starter": {
        "name": "Starter",
        "price_usd": 29,
        "max_streams": 5,
        "max_concurrent_viewers": 500,
        "bandwidth_gb": 500,
        "recording_enabled": True,
        "features": ["All Free features", "Recording & VOD", "Email support", "Analytics dashboard"]
    },
    "pro": {
        "name": "Pro",
        "price_usd": 99,
        "max_streams": 20,
        "max_concurrent_viewers": 2000,
        "bandwidth_gb": 2000,
        "recording_enabled": True,
        "features": ["All Starter features", "Custom transcoding", "Priority support", "Advanced analytics", "Team collaboration"]
    },
    "enterprise": {
        "name": "Enterprise",
        "price_usd": 499,
        "max_streams": -1,  # Unlimited
        "max_concurrent_viewers": -1,  # Unlimited
        "bandwidth_gb": -1,  # Unlimited
        "recording_enabled": True,
        "features": ["All Pro features", "Unlimited streams", "White-label", "Dedicated support", "SLA", "Custom integrations"]
    }
}


class SubscriptionCreate(BaseModel):
    tier: str
    payment_method_id: Optional[str] = None


class UsageRecord(BaseModel):
    metric: str
    value: float
    timestamp: datetime


@router.get("/plans")
async def get_subscription_plans():
    """
    Get available subscription plans
    """
    return {
        "plans": SUBSCRIPTION_TIERS
    }


@router.get("/subscription")
async def get_current_subscription(
    current_user: dict = Depends(get_current_user)
):
    """
    Get user's current subscription
    """
    subscription = await db.subscriptions.find_one(
        {"user_id": current_user["id"], "status": "active"},
        {"_id": 0}
    )
    
    if not subscription:
        # Return default free tier
        return {
            "user_id": current_user["id"],
            "tier": "free",
            "status": "active",
            "details": SUBSCRIPTION_TIERS["free"],
            "created_at": datetime.utcnow().isoformat()
        }
    
    # Convert ISO strings to datetime
    if isinstance(subscription.get('created_at'), str):
        subscription['created_at'] = datetime.fromisoformat(subscription['created_at'])
    if isinstance(subscription.get('next_billing_date'), str):
        subscription['next_billing_date'] = datetime.fromisoformat(subscription['next_billing_date'])
    
    # Add tier details
    subscription['details'] = SUBSCRIPTION_TIERS.get(subscription['tier'], SUBSCRIPTION_TIERS['free'])
    
    return subscription


@router.post("/subscription")
async def create_subscription(
    subscription_data: SubscriptionCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create or upgrade subscription
    """
    # Validate tier
    if subscription_data.tier not in SUBSCRIPTION_TIERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid subscription tier"
        )
    
    # Check if user already has a subscription
    existing = await db.subscriptions.find_one(
        {"user_id": current_user["id"], "status": "active"}
    )
    
    if existing:
        # Cancel existing subscription
        await db.subscriptions.update_one(
            {"user_id": current_user["id"], "status": "active"},
            {"$set": {"status": "cancelled", "cancelled_at": datetime.utcnow().isoformat()}}
        )
    
    # Create new subscription
    subscription = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "tier": subscription_data.tier,
        "status": "active",
        "payment_method_id": subscription_data.payment_method_id,
        "created_at": datetime.utcnow().isoformat(),
        "next_billing_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
        "details": SUBSCRIPTION_TIERS[subscription_data.tier]
    }
    
    # In production, this would integrate with Stripe
    # stripe.Subscription.create(...)
    
    await db.subscriptions.insert_one(subscription)
    
    logger.info(f"Subscription created: {subscription['id']} for user {current_user['id']}")
    
    return subscription


@router.delete("/subscription")
async def cancel_subscription(
    current_user: dict = Depends(get_current_user)
):
    """
    Cancel current subscription
    """
    result = await db.subscriptions.update_one(
        {"user_id": current_user["id"], "status": "active"},
        {"$set": {"status": "cancelled", "cancelled_at": datetime.utcnow().isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found"
        )
    
    return {"message": "Subscription cancelled successfully"}


@router.get("/usage")
async def get_usage_statistics(
    current_user: dict = Depends(get_current_user)
):
    """
    Get current billing period usage statistics
    """
    # Get current subscription
    subscription = await get_current_subscription(current_user)
    tier_limits = subscription['details']
    
    # Get usage from current billing period
    billing_start = datetime.utcnow() - timedelta(days=30)
    
    # Count streams
    streams_count = await db.streams.count_documents({
        "user_id": current_user["id"],
        "created_at": {"$gte": billing_start.isoformat()}
    })
    
    # Get all apps for user
    user_apps = await db.apps.find({"user_id": current_user["id"]}).to_list(100)
    app_ids = [app["id"] for app in user_apps]
    
    # Calculate bandwidth (mock)
    streams = await db.streams.find({
        "app_id": {"$in": app_ids},
        "created_at": {"$gte": billing_start.isoformat()}
    }).to_list(1000)
    
    bandwidth_gb = 0
    for stream in streams:
        duration_hours = stream.get("duration", 0) / 3600
        viewers = stream.get("peak_viewers", 0)
        bandwidth_gb += duration_hours * viewers * 2.25
    
    # Get recordings count
    recordings_count = await db.recordings.count_documents({
        "app_id": {"$in": app_ids},
        "created_at": {"$gte": billing_start.isoformat()}
    })
    
    return {
        "billing_period": {
            "start": billing_start.isoformat(),
            "end": datetime.utcnow().isoformat()
        },
        "tier": subscription['tier'],
        "usage": {
            "streams": {
                "used": streams_count,
                "limit": tier_limits['max_streams'],
                "percentage": round(streams_count / tier_limits['max_streams'] * 100, 2) if tier_limits['max_streams'] > 0 else 0
            },
            "bandwidth_gb": {
                "used": round(bandwidth_gb, 2),
                "limit": tier_limits['bandwidth_gb'],
                "percentage": round(bandwidth_gb / tier_limits['bandwidth_gb'] * 100, 2) if tier_limits['bandwidth_gb'] > 0 else 0
            },
            "recordings": {
                "used": recordings_count,
                "enabled": tier_limits['recording_enabled']
            }
        }
    }


@router.get("/invoices")
async def get_invoices(
    current_user: dict = Depends(get_current_user)
):
    """
    Get billing invoices history
    """
    invoices = await db.invoices.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Convert ISO strings
    for invoice in invoices:
        if isinstance(invoice.get('created_at'), str):
            invoice['created_at'] = datetime.fromisoformat(invoice['created_at'])
    
    return {"invoices": invoices}


@router.post("/payment-method")
async def add_payment_method(
    payment_method_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Add payment method (Stripe integration)
    """
    # In production, this would integrate with Stripe
    # customer = stripe.Customer.retrieve(current_user['stripe_customer_id'])
    # payment_method = stripe.PaymentMethod.attach(payment_method_id, customer=customer.id)
    
    payment_method = {
        "id": payment_method_id,
        "user_id": current_user["id"],
        "type": "card",
        "last4": "4242",
        "exp_month": 12,
        "exp_year": 2025,
        "created_at": datetime.utcnow().isoformat()
    }
    
    await db.payment_methods.insert_one(payment_method)
    
    return {"message": "Payment method added successfully", "payment_method": payment_method}
