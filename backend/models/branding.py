from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid

class Branding(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    app_id: str
    
    # Logo and Images
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    background_image_url: Optional[str] = None
    
    # Colors
    primary_color: str = "#3B82F6"  # Blue
    secondary_color: str = "#10B981"  # Green
    accent_color: str = "#8B5CF6"  # Purple
    background_color: str = "#FFFFFF"
    text_color: str = "#1F2937"
    
    # Typography
    font_family: str = "Inter, sans-serif"
    heading_font: Optional[str] = None
    
    # Custom Domain
    custom_domain: Optional[str] = None
    custom_domain_verified: bool = False
    
    # Player Customization
    player_skin: str = "default"  # default, modern, minimal, retro
    show_logo_in_player: bool = True
    watermark_position: str = "bottom-right"  # top-left, top-right, bottom-left, bottom-right
    
    # Email Branding
    email_header_color: Optional[str] = None
    email_footer_text: Optional[str] = None
    support_email: Optional[str] = None
    
    # Social Links
    website_url: Optional[str] = None
    twitter_url: Optional[str] = None
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "app_id": "abc123",
                "logo_url": "https://cdn.example.com/logo.png",
                "primary_color": "#3B82F6",
                "secondary_color": "#10B981",
                "custom_domain": "stream.mycompany.com",
                "player_skin": "modern"
            }
        }