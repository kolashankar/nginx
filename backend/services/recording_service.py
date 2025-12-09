"""
Recording Service

Handles automatic recording of live streams and VOD management
"""

import os
import logging
import asyncio
import subprocess
from typing import Optional, Dict, Any
from datetime import datetime
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient

from services.telegram_cdn import telegram_cdn

logger = logging.getLogger(__name__)


class RecordingService:
    """
    Service for recording live streams and managing VOD
    """
    
    def __init__(self, db):
        self.db = db
        self.recordings_dir = Path(os.getenv("RECORDINGS_DIR", "/tmp/recordings"))
        self.recordings_dir.mkdir(parents=True, exist_ok=True)
        self.active_recordings: Dict[str, Dict] = {}
    
    async def start_recording(self, stream_id: str, app_id: str, stream_url: str, metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Start recording a live stream
        
        Args:
            stream_id: Unique stream identifier
            app_id: App ID the stream belongs to
            stream_url: HLS or RTMP stream URL
            metadata: Additional metadata
        
        Returns:
            Recording details
        """
        try:
            if stream_id in self.active_recordings:
                logger.warning(f"Recording already active for stream: {stream_id}")
                return self.active_recordings[stream_id]
            
            output_file = self.recordings_dir / f"{stream_id}_{int(datetime.utcnow().timestamp())}.mp4"
            
            # Create recording record in database
            recording = {
                "id": f"rec_{stream_id}_{int(datetime.utcnow().timestamp())}",
                "stream_id": stream_id,
                "app_id": app_id,
                "title": metadata.get('title') if metadata else f"Recording {stream_id}",
                "description": metadata.get('description') if metadata else None,
                "status": "recording",
                "output_file": str(output_file),
                "created_at": datetime.utcnow().isoformat(),
                "metadata": metadata or {}
            }
            
            await self.db.recordings.insert_one(recording)
            
            # Start FFmpeg recording process
            # This is a mock implementation - in production, use actual FFmpeg
            logger.info(f"Starting recording for stream {stream_id} to {output_file}")
            
            self.active_recordings[stream_id] = recording
            
            # In production, spawn FFmpeg process:
            # ffmpeg_cmd = [
            #     'ffmpeg', '-i', stream_url,
            #     '-c', 'copy',
            #     '-f', 'mp4',
            #     str(output_file)
            # ]
            # process = subprocess.Popen(ffmpeg_cmd)
            # recording['process'] = process
            
            return recording
        
        except Exception as e:
            logger.error(f"Error starting recording: {str(e)}")
            raise
    
    async def stop_recording(self, stream_id: str) -> Dict[str, Any]:
        """
        Stop recording and upload to Telegram CDN
        
        Args:
            stream_id: Stream identifier
        
        Returns:
            Recording details with CDN URL
        """
        try:
            if stream_id not in self.active_recordings:
                logger.warning(f"No active recording for stream: {stream_id}")
                return None
            
            recording = self.active_recordings[stream_id]
            
            # Stop FFmpeg process (mock)
            logger.info(f"Stopping recording for stream {stream_id}")
            
            # In production, stop the process:
            # if 'process' in recording:
            #     recording['process'].terminate()
            #     recording['process'].wait()
            
            # Mock file creation
            output_file = Path(recording['output_file'])
            output_file.touch()  # Create empty file for demo
            
            # Update recording status
            recording['status'] = 'processing'
            recording['completed_at'] = datetime.utcnow().isoformat()
            recording['file_size'] = output_file.stat().st_size if output_file.exists() else 0
            
            await self.db.recordings.update_one(
                {"id": recording['id']},
                {"$set": recording}
            )
            
            # Upload to Telegram CDN
            if output_file.exists():
                try:
                    upload_result = await telegram_cdn.upload_file(
                        str(output_file),
                        stream_id,
                        metadata=recording.get('metadata')
                    )
                    
                    recording['telegram_file_id'] = upload_result['file_id']
                    recording['cdn_url'] = upload_result['cdn_url']
                    recording['status'] = 'completed'
                    
                    await self.db.recordings.update_one(
                        {"id": recording['id']},
                        {"$set": recording}
                    )
                    
                    # Clean up local file
                    output_file.unlink()
                    logger.info(f"Recording uploaded to Telegram CDN: {upload_result['file_id']}")
                
                except Exception as e:
                    logger.error(f"Error uploading recording: {str(e)}")
                    recording['status'] = 'failed'
                    await self.db.recordings.update_one(
                        {"id": recording['id']},
                        {"$set": recording}
                    )
            
            # Remove from active recordings
            del self.active_recordings[stream_id]
            
            return recording
        
        except Exception as e:
            logger.error(f"Error stopping recording: {str(e)}")
            raise
    
    async def get_recording(self, recording_id: str) -> Optional[Dict]:
        """
        Get recording details
        """
        recording = await self.db.recordings.find_one({"id": recording_id}, {"_id": 0})
        return recording
    
    async def list_recordings(self, app_id: str, limit: int = 50, skip: int = 0) -> list:
        """
        List recordings for an app
        """
        recordings = await self.db.recordings.find(
            {"app_id": app_id},
            {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        return recordings
    
    async def delete_recording(self, recording_id: str) -> bool:
        """
        Delete a recording from database and Telegram
        """
        try:
            recording = await self.get_recording(recording_id)
            if not recording:
                return False
            
            # Delete from Telegram if message_id exists
            if recording.get('telegram_message_id'):
                await telegram_cdn.delete_file(recording['telegram_message_id'])
            
            # Delete from database
            result = await self.db.recordings.delete_one({"id": recording_id})
            return result.deleted_count > 0
        
        except Exception as e:
            logger.error(f"Error deleting recording: {str(e)}")
            return False
    
    async def generate_thumbnail(self, recording_id: str) -> Optional[str]:
        """
        Generate thumbnail for a recording (mock implementation)
        """
        # In production, use FFmpeg to extract thumbnail:
        # ffmpeg -i video.mp4 -ss 00:00:01.000 -vframes 1 thumb.jpg
        
        logger.info(f"Generating thumbnail for recording {recording_id}")
        
        # Mock thumbnail URL
        thumbnail_url = f"https://cdn.telegram.org/thumb/{recording_id}.jpg"
        
        await self.db.recordings.update_one(
            {"id": recording_id},
            {"$set": {"thumbnail_url": thumbnail_url}}
        )
        
        return thumbnail_url
