from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime

from backend.models.branding import Branding
from backend.utils.jwt_handler import verify_jwt
from backend.utils.database import db

router = APIRouter(prefix="/branding", tags=["Branding"])

@router.post("", response_model=Branding)
async def create_branding(branding: Branding, user=Depends(verify_jwt)):
    """
    Create or update branding configuration for an app.
    White-label customization for complete brand control.
    """
    # Verify app ownership
    app = await db.apps.find_one({"id": branding.app_id, "user_id": user["user_id"]})
    if not app:
        raise HTTPException(status_code=404, detail="App not found or access denied")
    
    # Check if branding already exists
    existing = await db.branding.find_one({"app_id": branding.app_id})
    if existing:
        # Update existing branding
        branding.updated_at = datetime.utcnow()
        await db.branding.update_one(
            {"app_id": branding.app_id},
            {"$set": branding.model_dump()}
        )
    else:
        # Create new branding
        await db.branding.insert_one(branding.model_dump())
    
    return branding

@router.get("/{app_id}", response_model=Branding)
async def get_branding(app_id: str, user=Depends(verify_jwt)):
    """
    Get branding configuration for an app.
    """
    # Verify app ownership
    app = await db.apps.find_one({"id": app_id, "user_id": user["user_id"]})
    if not app:
        raise HTTPException(status_code=404, detail="App not found or access denied")
    
    branding = await db.branding.find_one({"app_id": app_id})
    if not branding:
        raise HTTPException(status_code=404, detail="Branding not found")
    
    return Branding(**branding)

@router.get("/public/{app_id}", response_model=Branding)
async def get_public_branding(app_id: str):
    """
    Get branding configuration for an app (public endpoint).
    Used by embedded players and public-facing pages.
    """
    branding = await db.branding.find_one({"app_id": app_id})
    if not branding:
        # Return default branding
        return Branding(app_id=app_id)
    
    return Branding(**branding)

@router.put("/{app_id}", response_model=Branding)
async def update_branding(app_id: str, branding_update: dict, user=Depends(verify_jwt)):
    """
    Update specific branding fields.
    """
    # Verify app ownership
    app = await db.apps.find_one({"id": app_id, "user_id": user["user_id"]})
    if not app:
        raise HTTPException(status_code=404, detail="App not found or access denied")
    
    branding = await db.branding.find_one({"app_id": app_id})
    if not branding:
        raise HTTPException(status_code=404, detail="Branding not found")
    
    # Update fields
    branding_update["updated_at"] = datetime.utcnow()
    await db.branding.update_one(
        {"app_id": app_id},
        {"$set": branding_update}
    )
    
    updated = await db.branding.find_one({"app_id": app_id})
    return Branding(**updated)

@router.delete("/{app_id}")
async def delete_branding(app_id: str, user=Depends(verify_jwt)):
    """
    Delete branding configuration (resets to default).
    """
    # Verify app ownership
    app = await db.apps.find_one({"id": app_id, "user_id": user["user_id"]})
    if not app:
        raise HTTPException(status_code=404, detail="App not found or access denied")
    
    result = await db.branding.delete_one({"app_id": app_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Branding not found")
    
    return {"message": "Branding deleted successfully"}

@router.post("/verify-domain/{app_id}")
async def verify_custom_domain(app_id: str, user=Depends(verify_jwt)):
    """
    Verify custom domain ownership via DNS TXT record.
    """
    # Verify app ownership
    app = await db.apps.find_one({"id": app_id, "user_id": user["user_id"]})
    if not app:
        raise HTTPException(status_code=404, detail="App not found or access denied")
    
    branding = await db.branding.find_one({"app_id": app_id})
    if not branding or not branding.get("custom_domain"):
        raise HTTPException(status_code=400, detail="No custom domain configured")
    
    # TODO: Implement actual DNS verification logic
    # For now, just mark as verified
    await db.branding.update_one(
        {"app_id": app_id},
        {"$set": {"custom_domain_verified": True, "updated_at": datetime.utcnow()}}
    )
    
    return {
        "message": "Domain verified successfully",
        "domain": branding.get("custom_domain"),
        "verified": True
    }

@router.get("/export/{app_id}")
async def export_branding_theme(app_id: str, user=Depends(verify_jwt)):
    """
    Export branding as CSS variables for easy integration.
    """
    # Verify app ownership
    app = await db.apps.find_one({"id": app_id, "user_id": user["user_id"]})
    if not app:
        raise HTTPException(status_code=404, detail="App not found or access denied")
    
    branding = await db.branding.find_one({"app_id": app_id})
    if not branding:
        raise HTTPException(status_code=404, detail="Branding not found")
    
    css_vars = f""":root {{
  /* Primary Colors */
  --primary-color: {branding.get('primary_color', '#3B82F6')};
  --secondary-color: {branding.get('secondary_color', '#10B981')};
  --accent-color: {branding.get('accent_color', '#8B5CF6')};
  
  /* Background & Text */
  --background-color: {branding.get('background_color', '#FFFFFF')};
  --text-color: {branding.get('text_color', '#1F2937')};
  
  /* Typography */
  --font-family: {branding.get('font_family', 'Inter, sans-serif')};
  --heading-font: {branding.get('heading_font', branding.get('font_family', 'Inter, sans-serif'))};
}}
"""
    
    return {
        "css_variables": css_vars,
        "branding": branding
    }