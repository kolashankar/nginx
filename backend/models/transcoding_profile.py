"""
Transcoding Profile Model

Custom transcoding configurations per app
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
import uuid


class VideoQuality(BaseModel):
    name: str  # 1080p, 720p, 480p, 360p
    width: int
    height: int
    bitrate: int  # in kbps
    fps: Optional[int] = 30


class TranscodingProfileBase(BaseModel):
    app_id: str
    name: str
    description: Optional[str] = None
    qualities: List[VideoQuality] = [
        VideoQuality(name="1080p", width=1920, height=1080, bitrate=5000, fps=30),
        VideoQuality(name="720p", width=1280, height=720, bitrate=2500, fps=30),
        VideoQuality(name="480p", width=854, height=480, bitrate=1200, fps=30),
        VideoQuality(name="360p", width=640, height=360, bitrate=800, fps=30)
    ]
    audio_bitrate: int = 128  # in kbps
    audio_codec: str = "aac"
    video_codec: str = "h264"
    container_format: str = "hls"
    segment_duration: int = 4  # in seconds
    enable_gpu_acceleration: bool = False
    is_default: bool = False


class TranscodingProfileCreate(TranscodingProfileBase):
    pass


class TranscodingProfile(TranscodingProfileBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "profile_123",
                "app_id": "app_456",
                "name": "HD Gaming Profile",
                "description": "Optimized for gaming streams",
                "qualities": [
                    {"name": "1080p60", "width": 1920, "height": 1080, "bitrate": 6000, "fps": 60},
                    {"name": "720p60", "width": 1280, "height": 720, "bitrate": 3500, "fps": 60}
                ],
                "audio_bitrate": 192,
                "enable_gpu_acceleration": True
            }
        }
