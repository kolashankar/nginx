# 🎯 NGINX Streaming Engine Development Plan for WedLive
## Complete Replacement of GetStream.io with Custom NGINX Solution

---

## 📊 Current WedLive Architecture Analysis

### GetStream.io Features Currently Used
1. **Video Streaming**
   - RTMP ingestion with JWT authentication
   - HLS playback with adaptive bitrate
   - Multi-quality transcoding (240p to 4K)
   - Livestream call management
   - Recording/DVR functionality

2. **Real-time Features**
   - Live viewer count tracking
   - Chat messaging (Socket.io - already separate)
   - Emoji reactions (Socket.io - already separate)
   - Multi-camera switching

3. **API Integration**
   - User token generation (JWT)
   - Call creation and management
   - Stream status monitoring
   - Playback URL generation

### Features Already Independent (No Change Needed)
- ✅ Socket.io for chat/reactions (socket_service.py)
- ✅ MongoDB for data persistence
- ✅ Telegram CDN for media storage
- ✅ Razorpay for payments
- ✅ JWT authentication for users

---

## 🚀 NGINX Development Phases

### **PHASE 1: Core NGINX RTMP Streaming Infrastructure** (Week 1)
**Goal:** Replace GetStream.io video ingestion and basic playback

#### 1.1 Basic RTMP Server Setup
**Files to Create:**
- `/streaming-engine/nginx-wedlive.conf` - WedLive-specific NGINX config
- `/backend/app/services/nginx_stream_service.py` - NGINX stream management

**Features to Implement:**
```nginx
rtmp {
    server {
        listen 1935;
        chunk_size 4096;
        
        application live {
            live on;
            record off;
            
            # JWT-based authentication
            on_publish http://backend:8000/api/streams/auth/publish;
            on_publish_done http://backend:8000/api/streams/auth/publish_done;
            
            # Push to HLS application
            push rtmp://localhost:1935/hls;
        }
        
        application hls {
            live on;
            hls on;
            hls_path /tmp/hls;
            hls_fragment 3s;
            hls_playlist_length 60s;
            hls_nested on;
        }
    }
}
```

**Backend API Endpoints:**
- `POST /api/streams/auth/publish` - Validate JWT stream key
- `POST /api/streams/auth/publish_done` - Track stream end
- `POST /api/streams/credentials/generate` - Generate stream credentials
- `GET /api/streams/playback/{wedding_id}` - Get HLS playback URL

**Database Schema Updates:**
```python
# weddings collection - add NGINX fields
{
    "nginx_stream": {
        "stream_key": "jwt_token_here",
        "rtmp_url": "rtmp://your-domain.com:1935/live",
        "hls_playback_url": "https://your-domain.com/hls/{wedding_id}/index.m3u8",
        "stream_id": "unique_stream_id"
    }
}
```

**Testing Checklist:**
- [ ] RTMP server accepts OBS connections
- [ ] JWT authentication validates stream keys
- [ ] HLS segments generate correctly
- [ ] Playback works in browser
- [ ] Stream start/stop events tracked

---

### **PHASE 2: Multi-Quality Adaptive Bitrate (ABR)** (Week 1-2)
**Goal:** Implement quality tiers (240p to 4K) with plan-based restrictions

#### 2.1 FFmpeg Transcoding Pipeline
**Configuration:**
```nginx
application transcode {
    live on;
    record off;
    
    # Quality-based transcoding
    # 4K (Premium only)
    exec_push ffmpeg -i rtmp://localhost:1935/transcode/$name 
        -c:v libx264 -c:a aac -b:v 15000k -b:a 256k 
        -vf "scale=3840:2160" -preset veryfast -g 60 
        -f flv rtmp://localhost:1935/hls/$name_4k;
    
    # 1080p (Premium only)
    exec_push ffmpeg -i rtmp://localhost:1935/transcode/$name 
        -c:v libx264 -c:a aac -b:v 5000k -b:a 192k 
        -vf "scale=1920:1080" -preset veryfast -g 60 
        -f flv rtmp://localhost:1935/hls/$name_1080p;
    
    # 720p (Premium)
    exec_push ffmpeg -i rtmp://localhost:1935/transcode/$name 
        -c:v libx264 -c:a aac -b:v 2800k -b:a 128k 
        -vf "scale=1280:720" -preset veryfast -g 60 
        -f flv rtmp://localhost:1935/hls/$name_720p;
    
    # 480p (Free + Premium)
    exec_push ffmpeg -i rtmp://localhost:1935/transcode/$name 
        -c:v libx264 -c:a aac -b:v 1400k -b:a 96k 
        -vf "scale=854:480" -preset veryfast -g 60 
        -f flv rtmp://localhost:1935/hls/$name_480p;
    
    # 360p (Free + Premium)
    exec_push ffmpeg -i rtmp://localhost:1935/transcode/$name 
        -c:v libx264 -c:a aac -b:v 800k -b:a 64k 
        -vf "scale=640:360" -preset veryfast -g 60 
        -f flv rtmp://localhost:1935/hls/$name_360p;
    
    # 240p (Free + Premium)
    exec_push ffmpeg -i rtmp://localhost:1935/transcode/$name 
        -c:v libx264 -c:a aac -b:v 400k -b:a 64k 
        -vf "scale=426:240" -preset veryfast -g 60 
        -f flv rtmp://localhost:1935/hls/$name_240p;
}

application hls {
    live on;
    hls on;
    hls_path /tmp/hls;
    hls_fragment 3s;
    hls_playlist_length 60s;
    hls_nested on;
    
    # Variant playlist for ABR
    hls_variant _4k BANDWIDTH=15000000,RESOLUTION=3840x2160;
    hls_variant _1080p BANDWIDTH=5000000,RESOLUTION=1920x1080;
    hls_variant _720p BANDWIDTH=2800000,RESOLUTION=1280x720;
    hls_variant _480p BANDWIDTH=1400000,RESOLUTION=854x480;
    hls_variant _360p BANDWIDTH=800000,RESOLUTION=640x360;
    hls_variant _240p BANDWIDTH=400000,RESOLUTION=426x240;
}
```

**Backend Service:**
```python
# /backend/app/services/nginx_quality_service.py
class QualityService:
    def get_allowed_qualities(self, user_plan: str) -> List[str]:
        """Return allowed quality options based on plan"""
        if user_plan == "free":
            return ["240p", "360p", "480p"]
        else:  # premium
            return ["240p", "360p", "480p", "720p", "1080p", "4k"]
    
    def generate_playlist(self, wedding_id: str, user_plan: str):
        """Generate HLS master playlist with plan-based qualities"""
        qualities = self.get_allowed_qualities(user_plan)
        # Generate m3u8 with only allowed variants
```

**API Endpoints:**
- `GET /api/streams/qualities/{wedding_id}` - Get available qualities
- `POST /api/streams/quality/select` - Set preferred quality
- `GET /api/streams/playlist/{wedding_id}.m3u8` - Dynamic playlist

**Frontend Updates:**
- Quality selector dropdown (already exists in UI)
- Automatic quality switching based on bandwidth
- Quality badge display

**Testing Checklist:**
- [ ] All 6 quality tiers generate correctly
- [ ] Free users limited to 480p max
- [ ] Premium users access all qualities
- [ ] Quality switching works seamlessly
- [ ] Bandwidth detection accurate

---

### **PHASE 3: HLS Encryption & Security** (Week 2)
**Goal:** Secure content delivery with AES-128 encryption

#### 3.1 Encryption Setup
**Configuration:**
```nginx
application hls {
    live on;
    hls on;
    hls_path /tmp/hls;
    hls_fragment 3s;
    
    # AES-128 encryption
    hls_keys on;
    hls_key_path /etc/nginx/keys;
    hls_key_url https://your-domain.com/api/streams/keys/;
    hls_fragments_per_key 10;
}
```

**Backend Implementation:**
```python
# /backend/app/services/encryption_service.py
class EncryptionService:
    def generate_encryption_key(self, wedding_id: str):
        """Generate AES-128 key for wedding stream"""
        key = os.urandom(16)  # 128-bit key
        iv = os.urandom(16)   # Initialization vector
        
        # Store in database
        # Serve via secured endpoint
        return key, iv
    
    def get_key_for_viewer(self, wedding_id: str, viewer_token: str):
        """Authenticate and serve decryption key"""
        # Validate viewer has access
        # Return key only if authorized
```

**API Endpoints:**
- `GET /api/streams/keys/{wedding_id}/{segment}.key` - Serve encryption key
- `POST /api/streams/keys/rotate/{wedding_id}` - Rotate encryption keys

**Features:**
- Per-wedding encryption keys
- Key rotation every 24 hours
- Viewer authentication before key delivery
- Locked wedding content protection

**Testing Checklist:**
- [ ] Encrypted segments play correctly
- [ ] Unauthorized viewers cannot access keys
- [ ] Key rotation works without interruption
- [ ] Locked weddings remain secure

---

### **PHASE 4: DVR Recording & Storage** (Week 2-3)
**Goal:** Automatic recording with quality options and cloud storage

#### 4.1 Recording Configuration
**NGINX Setup:**
```nginx
application live {
    live on;
    
    # Recording settings
    record all;
    record_path /tmp/recordings;
    record_suffix _%Y%m%d_%H%M%S.flv;
    record_max_size 2048M;  # 2GB chunks
    record_unique on;
    record_notify on;
    
    # Recording webhooks
    on_record_done http://backend:8000/api/streams/recording/complete;
}
```

**Backend Service:**
```python
# /backend/app/services/recording_service.py
class RecordingService:
    async def process_recording(self, wedding_id: str, file_path: str):
        """Process completed recording"""
        # 1. Convert FLV to MP4
        mp4_path = await self.convert_to_mp4(file_path)
        
        # 2. Generate thumbnails
        thumbnails = await self.generate_thumbnails(mp4_path)
        
        # 3. Upload to Telegram CDN (or S3/storage)
        cdn_url = await self.upload_to_storage(mp4_path)
        
        # 4. Update database
        await self.save_recording(wedding_id, cdn_url, thumbnails)
        
        # 5. Cleanup local files
        os.remove(file_path)
        os.remove(mp4_path)
    
    async def convert_to_mp4(self, flv_path: str):
        """Convert FLV recording to MP4"""
        mp4_path = flv_path.replace('.flv', '.mp4')
        cmd = [
            'ffmpeg', '-i', flv_path,
            '-c:v', 'copy', '-c:a', 'copy',
            mp4_path
        ]
        subprocess.run(cmd)
        return mp4_path
```

**API Endpoints:**
- `POST /api/streams/recording/start` - Start recording
- `POST /api/streams/recording/stop` - Stop recording
- `POST /api/streams/recording/complete` - Webhook for completion
- `GET /api/streams/recordings/{wedding_id}` - List recordings
- `DELETE /api/streams/recordings/{recording_id}` - Delete recording

**Features:**
- Automatic recording when stream starts
- Multiple recording qualities
- Cloud storage integration (Telegram CDN)
- Recording metadata (duration, size, thumbnails)
- Auto-delete after X days (configurable)

**Testing Checklist:**
- [ ] Recordings start automatically
- [ ] FLV to MP4 conversion works
- [ ] Recordings uploaded to CDN
- [ ] Playback works correctly
- [ ] Auto-delete functions properly

---

### **PHASE 5: Multi-Camera Support** (Week 3)
**Goal:** Support multiple camera angles with seamless switching

#### 5.1 Multi-Camera Architecture
**NGINX Configuration:**
```nginx
# Main camera
application live {
    live on;
    on_publish http://backend:8000/api/streams/auth/publish;
    push rtmp://localhost:1935/transcode/$name;
}

# Camera 2, 3, 4... (dynamic)
application camera_2 {
    live on;
    on_publish http://backend:8000/api/streams/auth/publish_camera;
    push rtmp://localhost:1935/transcode/${name}_cam2;
}
```

**Backend Service:**
```python
# /backend/app/services/multi_camera_service.py
class MultiCameraService:
    async def add_camera(self, wedding_id: str, camera_name: str):
        """Add a new camera stream"""
        # Generate unique stream key for camera
        camera_id = str(uuid.uuid4())
        jwt_token = self.generate_jwt_token(wedding_id, camera_id)
        
        # Store camera configuration
        camera = {
            "camera_id": camera_id,
            "camera_name": camera_name,
            "stream_key": jwt_token,
            "rtmp_url": f"rtmp://your-domain.com:1935/camera_{camera_id}",
            "hls_url": f"/hls/{wedding_id}/{camera_id}/index.m3u8",
            "status": "waiting"
        }
        
        await db.camera_streams.insert_one(camera)
        return camera
    
    async def switch_camera(self, wedding_id: str, camera_id: str):
        """Switch active camera view"""
        # Update active camera in database
        # Broadcast switch event via Socket.io
        await socket_service.broadcast_to_wedding(
            wedding_id,
            'camera_switched',
            {'camera_id': camera_id}
        )
```

**API Endpoints:**
- `POST /api/streams/camera/add` - Add new camera
- `DELETE /api/streams/camera/{camera_id}` - Remove camera
- `GET /api/streams/cameras/{wedding_id}` - List all cameras
- `POST /api/streams/camera/switch` - Switch active camera

**Frontend Features:**
- Camera grid view (PiP - Picture in Picture)
- Camera selector dropdown
- Camera status indicators
- Automatic camera switching

**Testing Checklist:**
- [ ] Multiple cameras stream simultaneously
- [ ] Each camera has unique credentials
- [ ] Camera switching works smoothly
- [ ] Camera status updates correctly
- [ ] PiP view displays properly

---

### **PHASE 6: Real-Time Statistics & Monitoring** (Week 3-4)
**Goal:** Track viewer count, bandwidth, and stream health

#### 6.1 Statistics Collection
**NGINX Stats Module:**
```nginx
http {
    server {
        listen 8080;
        
        location /stat {
            rtmp_stat all;
            rtmp_stat_stylesheet stat.xsl;
        }
        
        location /control {
            rtmp_control all;
        }
    }
}
```

**Backend Service:**
```python
# /backend/app/services/stats_service.py
class StatsService:
    async def get_stream_stats(self, wedding_id: str):
        """Get real-time stream statistics from NGINX"""
        # Parse NGINX stat XML
        stat_url = "http://nginx:8080/stat"
        response = requests.get(stat_url)
        stats = self.parse_rtmp_stats(response.text)
        
        return {
            "is_live": stats.get("live", False),
            "viewers": stats.get("viewers", 0),
            "bandwidth_in": stats.get("bw_in", 0),
            "bandwidth_out": stats.get("bw_out", 0),
            "uptime": stats.get("uptime", 0),
            "quality": stats.get("quality", "480p")
        }
    
    async def track_viewer_session(self, wedding_id: str, viewer_id: str):
        """Track viewer analytics"""
        session = {
            "wedding_id": wedding_id,
            "viewer_id": viewer_id,
            "joined_at": datetime.utcnow(),
            "quality_switches": [],
            "buffer_events": []
        }
        await db.viewer_sessions.insert_one(session)
```

**API Endpoints:**
- `GET /api/streams/stats/{wedding_id}` - Real-time statistics
- `GET /api/streams/health/{wedding_id}` - Stream health check
- `POST /api/streams/analytics/track` - Track viewer events

**Socket.io Events (Already Exists):**
- `viewer_count` - Broadcast viewer count updates
- `stream_quality_update` - Quality change events
- `stream_status` - Live/offline status

**Features:**
- Real-time viewer count
- Bandwidth monitoring
- Quality metrics tracking
- Stream health dashboard
- Viewer analytics (watch time, quality preferences)

**Testing Checklist:**
- [ ] Viewer count updates in real-time
- [ ] Bandwidth stats accurate
- [ ] Health checks detect issues
- [ ] Analytics data persists correctly

---

### **PHASE 7: Load Balancing & Caching** (Week 4)
**Goal:** Scale horizontally with multiple NGINX instances

#### 7.1 Load Balancer Setup
**NGINX Load Balancer Config:**
```nginx
# Load balancer instance
upstream rtmp_backend {
    least_conn;
    server stream1.wedlive.com:1935 max_fails=3 fail_timeout=30s;
    server stream2.wedlive.com:1935 max_fails=3 fail_timeout=30s;
    server stream3.wedlive.com:1935 max_fails=3 fail_timeout=30s;
}

upstream hls_backend {
    ip_hash;  # Sticky sessions for HLS
    server stream1.wedlive.com:8080;
    server stream2.wedlive.com:8080;
    server stream3.wedlive.com:8080;
}

stream {
    server {
        listen 1935;
        proxy_pass rtmp_backend;
        proxy_timeout 3s;
    }
}

http {
    proxy_cache_path /var/cache/nginx/hls 
                     levels=1:2 
                     keys_zone=hls_cache:10m 
                     max_size=1g 
                     inactive=10m;
    
    server {
        listen 80;
        
        location /hls {
            proxy_pass http://hls_backend;
            proxy_cache hls_cache;
            proxy_cache_valid 200 3s;
            proxy_cache_key "$scheme$request_method$host$request_uri";
            add_header X-Cache-Status $upstream_cache_status;
        }
    }
}
```

**Backend Updates:**
```python
# /backend/app/services/load_balancer_service.py
class LoadBalancerService:
    async def get_best_server(self) -> str:
        """Return least loaded streaming server"""
        servers = await self.get_server_stats()
        return min(servers, key=lambda s: s['load'])
    
    async def health_check_servers(self):
        """Check health of all streaming servers"""
        # Ping each server
        # Update Redis with server status
```

**Features:**
- Round-robin RTMP distribution
- IP-based HLS sticky sessions
- Automatic failover
- Health check monitoring
- Redis-based server state

**Testing Checklist:**
- [ ] Load distributes across servers
- [ ] Failover works automatically
- [ ] HLS segments cached properly
- [ ] No stream interruption during failover

---

### **PHASE 8: CDN Integration & Edge Caching** (Week 4-5)
**Goal:** Deliver HLS content via CDN for global performance

#### 8.1 CDN Configuration
**CloudFront / Cloudflare Setup:**
```yaml
# CDN Behavior Rules
Behaviors:
  - PathPattern: /hls/*
    Origin: nginx-origin.wedlive.com
    CacheBehavior:
      MinTTL: 0
      MaxTTL: 10
      DefaultTTL: 3
      ForwardedValues:
        QueryString: true
        Headers: [Origin, Range]
    Compress: true
```

**NGINX Origin Config:**
```nginx
http {
    server {
        listen 80;
        
        location /hls {
            root /tmp;
            
            # CORS for CDN
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods 'GET, OPTIONS';
            
            # Cache headers
            add_header Cache-Control "public, max-age=3";
            
            # Byte range support
            add_header Accept-Ranges bytes;
        }
    }
}
```

**Backend Service:**
```python
# /backend/app/services/cdn_service.py
class CDNService:
    def get_cdn_url(self, wedding_id: str) -> str:
        """Return CDN URL for HLS playback"""
        cdn_domain = os.getenv("CDN_DOMAIN", "cdn.wedlive.com")
        return f"https://{cdn_domain}/hls/{wedding_id}/index.m3u8"
    
    async def invalidate_cache(self, wedding_id: str):
        """Invalidate CDN cache for wedding stream"""
        # CloudFront/Cloudflare cache purge
```

**Features:**
- Global edge caching
- Reduced origin load
- Lower latency for viewers
- Bandwidth cost reduction

**Testing Checklist:**
- [ ] CDN serves HLS correctly
- [ ] Cache headers appropriate
- [ ] Invalidation works
- [ ] Latency improved globally

---

### **PHASE 9: Webhook System & Event Streaming** (Week 5)
**Goal:** Event-driven architecture for stream lifecycle

#### 9.1 Webhook Implementation
**Webhook Events:**
```python
# /backend/app/services/webhook_dispatcher.py
class WebhookDispatcher:
    EVENTS = {
        "stream.started": "on_publish",
        "stream.stopped": "on_publish_done",
        "stream.quality_changed": "on_quality_change",
        "viewer.joined": "on_play",
        "viewer.left": "on_play_done",
        "recording.completed": "on_record_done",
        "camera.added": "on_camera_added",
        "camera.switched": "on_camera_switched"
    }
    
    async def dispatch(self, event: str, data: dict):
        """Send webhook to registered endpoints"""
        webhooks = await db.webhooks.find({"events": event}).to_list()
        
        for webhook in webhooks:
            await self.send_webhook(webhook['url'], event, data)
    
    async def send_webhook(self, url: str, event: str, data: dict):
        """Send HTTP POST to webhook URL"""
        payload = {
            "event": event,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        signature = self.generate_signature(payload)
        headers = {"X-Webhook-Signature": signature}
        
        async with httpx.AsyncClient() as client:
            await client.post(url, json=payload, headers=headers)
```

**API Endpoints:**
- `POST /api/webhooks/register` - Register webhook endpoint
- `DELETE /api/webhooks/{webhook_id}` - Delete webhook
- `GET /api/webhooks/logs` - View webhook delivery logs
- `POST /api/webhooks/test` - Test webhook delivery

**Webhook Payloads:**
```json
// stream.started
{
    "event": "stream.started",
    "data": {
        "wedding_id": "123",
        "stream_key": "jwt_token",
        "quality": "1080p",
        "started_at": "2024-01-15T10:00:00Z"
    }
}

// viewer.joined
{
    "event": "viewer.joined",
    "data": {
        "wedding_id": "123",
        "viewer_id": "viewer_456",
        "viewer_count": 42
    }
}

// recording.completed
{
    "event": "recording.completed",
    "data": {
        "wedding_id": "123",
        "recording_id": "rec_789",
        "duration": 3600,
        "file_size": 1048576000,
        "cdn_url": "https://cdn.com/recordings/rec_789.mp4"
    }
}
```

**Testing Checklist:**
- [ ] Webhooks fire on events
- [ ] Signature validation works
- [ ] Retry logic for failures
- [ ] Logs track delivery status

---

### **PHASE 10: Compression & Bandwidth Optimization** (Week 5-6)
**Goal:** Reduce bandwidth costs and improve performance

#### 10.1 Chunked Streaming
**NGINX Configuration:**
```nginx
http {
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_types application/vnd.apple.mpegurl video/mp2t;
    
    # HTTP/2 support
    listen 443 ssl http2;
    
    # Chunked transfer
    chunked_transfer_encoding on;
    
    server {
        location /hls {
            # Slice module for range requests
            slice 1m;
            proxy_cache_key $uri$is_args$args$slice_range;
            proxy_set_header Range $slice_range;
            proxy_http_version 1.1;
        }
    }
}
```

**Backend Service:**
```python
# /backend/app/services/compression_service.py
class CompressionService:
    async def optimize_segment(self, segment_path: str):
        """Compress HLS segment for bandwidth savings"""
        # Apply additional compression
        # Generate lower quality variants on-demand
```

**Features:**
- Gzip compression for playlists
- HTTP/2 multiplexing
- Byte-range requests
- On-demand quality generation
- Bandwidth throttling for free users

**Testing Checklist:**
- [ ] Segments compressed properly
- [ ] HTTP/2 enabled
- [ ] Range requests work
- [ ] Bandwidth savings measured

---

### **PHASE 11: Encrypted Communication & SSL/TLS** (Week 6)
**Goal:** Secure all communication channels

#### 11.1 SSL/TLS Configuration
**NGINX SSL Setup:**
```nginx
http {
    server {
        listen 443 ssl http2;
        
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        
        # HSTS
        add_header Strict-Transport-Security "max-age=31536000" always;
        
        location /hls {
            # Serve encrypted HLS
        }
    }
}
```

**RTMPS Support:**
```nginx
# RTMPS (RTMP over SSL)
stream {
    server {
        listen 1936 ssl;
        
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        
        proxy_pass rtmp://localhost:1935;
    }
}
```

**Features:**
- HTTPS for HLS delivery
- RTMPS for secure RTMP (optional)
- Certificate auto-renewal (Let's Encrypt)
- Secure WebSocket connections

**Testing Checklist:**
- [ ] SSL certificates valid
- [ ] HTTPS enforced
- [ ] Mixed content warnings resolved
- [ ] Auto-renewal works

---

### **PHASE 12: Advanced Analytics & Metrics** (Week 6-7)
**Goal:** Comprehensive streaming analytics

#### 12.1 Analytics System
**Backend Service:**
```python
# /backend/app/services/analytics_service.py
class AnalyticsService:
    async def track_stream_metrics(self, wedding_id: str):
        """Track detailed stream metrics"""
        metrics = {
            "wedding_id": wedding_id,
            "timestamp": datetime.utcnow(),
            "viewers": {
                "total": await self.get_total_viewers(wedding_id),
                "peak": await self.get_peak_viewers(wedding_id),
                "by_quality": await self.get_viewers_by_quality(wedding_id)
            },
            "bandwidth": {
                "total_mb": await self.get_total_bandwidth(wedding_id),
                "average_mbps": await self.get_avg_bandwidth(wedding_id)
            },
            "engagement": {
                "avg_watch_time": await self.get_avg_watch_time(wedding_id),
                "chat_messages": await self.get_chat_count(wedding_id),
                "reactions": await self.get_reaction_count(wedding_id)
            },
            "quality_distribution": await self.get_quality_distribution(wedding_id)
        }
        
        await db.stream_analytics.insert_one(metrics)
        return metrics
```

**API Endpoints:**
- `GET /api/analytics/stream/{wedding_id}` - Stream analytics
- `GET /api/analytics/viewer/{wedding_id}` - Viewer analytics
- `GET /api/analytics/bandwidth/{wedding_id}` - Bandwidth usage
- `GET /api/analytics/engagement/{wedding_id}` - Engagement metrics

**Dashboard Metrics:**
- Total views and unique viewers
- Peak concurrent viewers
- Average watch time
- Quality distribution
- Bandwidth consumption
- Geographic distribution
- Device/browser breakdown
- Engagement rates (chat, reactions)

**Testing Checklist:**
- [ ] Metrics collected accurately
- [ ] Real-time dashboard updates
- [ ] Historical data accessible
- [ ] Export functionality works

---

### **PHASE 13: Plan-Based Feature Restrictions** (Week 7)
**Goal:** Enforce WedLive plan limits in NGINX

#### 13.1 Feature Gating
**Backend Service:**
```python
# /backend/app/services/plan_enforcement_service.py
class PlanEnforcementService:
    async def validate_stream_start(self, wedding_id: str, quality: str):
        """Validate if user can stream at requested quality"""
        wedding = await db.weddings.find_one({"_id": wedding_id})
        user = await db.users.find_one({"_id": wedding['created_by']})
        
        # Check plan restrictions
        plan = user.get('subscription', {}).get('plan', 'free')
        allowed_qualities = self.get_allowed_qualities(plan)
        
        if quality not in allowed_qualities:
            raise HTTPException(403, "Quality not available in your plan")
        
        # Check wedding limit for free users
        if plan == 'free':
            wedding_count = await db.weddings.count_documents(
                {"created_by": user['_id']}
            )
            if wedding_count > 1:
                raise HTTPException(403, "Free plan limited to 1 wedding")
        
        return True
    
    def get_allowed_qualities(self, plan: str) -> List[str]:
        if plan == 'free':
            return ['240p', '360p', '480p']
        else:
            return ['240p', '360p', '480p', '720p', '1080p', '4k']
```

**NGINX Dynamic Config:**
```python
# Generate NGINX config based on plan
def generate_nginx_config(wedding_id: str, plan: str):
    if plan == 'free':
        # Only enable 240p, 360p, 480p transcoding
        config = """
        exec_push ffmpeg -i rtmp://localhost:1935/transcode/$name 
            -c:v libx264 -b:v 1400k 
            -vf "scale=854:480" 
            -f flv rtmp://localhost:1935/hls/$name_480p;
        """
    else:
        # Enable all qualities
        config = """
        # All quality variants
        """
    
    return config
```

**Features:**
- Quality restrictions by plan
- Wedding limit enforcement
- Storage quota validation
- Multi-camera restriction (premium only)
- Custom branding restriction
- Recording quality limits

**Testing Checklist:**
- [ ] Free users limited to 480p
- [ ] Premium users access all qualities
- [ ] Wedding limits enforced
- [ ] Storage quotas respected
- [ ] Feature flags work correctly

---

### **PHASE 14: Auto-Scaling & Performance Optimization** (Week 7-8)
**Goal:** Handle variable load efficiently

#### 14.1 Auto-Scaling Setup
**Kubernetes HPA:**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nginx-streaming-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nginx-streaming
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: nginx_rtmp_connections
      target:
        type: AverageValue
        averageValue: "100"
```

**Backend Service:**
```python
# /backend/app/services/scaling_service.py
class ScalingService:
    async def predict_load(self):
        """Predict upcoming load based on scheduled weddings"""
        upcoming_weddings = await db.weddings.count_documents({
            "date": {
                "$gte": datetime.utcnow(),
                "$lte": datetime.utcnow() + timedelta(hours=2)
            }
        })
        
        # Request scale-up if needed
        if upcoming_weddings > 10:
            await self.scale_up(replicas=upcoming_weddings // 5)
```

**Performance Optimizations:**
- Worker process tuning
- Connection pooling
- Buffer size optimization
- Kernel parameter tuning
- Memory allocation optimization

**Testing Checklist:**
- [ ] Auto-scaling triggers correctly
- [ ] Performance maintained under load
- [ ] Resource usage optimized
- [ ] No degradation during scale events

---

### **PHASE 15: Monitoring, Alerting & Logging** (Week 8)
**Goal:** Complete observability stack

#### 15.1 Monitoring Stack
**Prometheus Metrics:**
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'nginx-rtmp'
    static_configs:
      - targets: ['nginx:9113']
    metrics_path: /metrics
```

**Grafana Dashboards:**
- Stream Health Dashboard
  - Active streams
  - Viewer count
  - Bandwidth usage
  - Quality distribution
  
- System Metrics Dashboard
  - CPU/Memory usage
  - Network I/O
  - Disk usage
  - Error rates

**Alert Rules:**
```yaml
groups:
  - name: streaming_alerts
    rules:
      - alert: StreamDown
        expr: nginx_rtmp_streams == 0 AND weddings_scheduled == 1
        for: 1m
        annotations:
          summary: "Stream is down but wedding is scheduled"
      
      - alert: HighCPU
        expr: cpu_usage > 85
        for: 5m
        annotations:
          summary: "High CPU usage on streaming server"
      
      - alert: LowViewerCount
        expr: viewer_count < expected_viewers * 0.5
        for: 10m
        annotations:
          summary: "Viewer count lower than expected"
```

**Logging:**
```python
# Structured logging
import structlog

logger = structlog.get_logger()

logger.info(
    "stream_started",
    wedding_id=wedding_id,
    quality="1080p",
    user_plan="premium",
    viewer_count=0
)
```

**Testing Checklist:**
- [ ] Metrics collected correctly
- [ ] Alerts fire appropriately
- [ ] Logs centralized (ELK/Loki)
- [ ] Dashboards display accurately

---

## 📋 Complete Feature Mapping

### GetStream.io → Custom NGINX Equivalents

| GetStream.io Feature | NGINX Implementation | Phase | Status |
|---------------------|---------------------|-------|--------|
| RTMP Ingestion | NGINX RTMP module | 1 | ⏳ |
| JWT Authentication | Custom JWT validation | 1 | ⏳ |
| HLS Playback | NGINX HLS module | 1 | ⏳ |
| Multi-quality (ABR) | FFmpeg transcoding | 2 | ⏳ |
| Quality variants | HLS variant playlists | 2 | ⏳ |
| Content encryption | AES-128 encryption | 3 | ⏳ |
| DVR Recording | RTMP record module | 4 | ⏳ |
| Multi-camera | Multiple RTMP apps | 5 | ⏳ |
| Viewer count | Socket.io + NGINX stats | 6 | ✅ Already exists |
| Stream statistics | RTMP stat module | 6 | ⏳ |
| Load balancing | NGINX upstream | 7 | ⏳ |
| CDN delivery | CloudFront/Cloudflare | 8 | ⏳ |
| Webhooks | Custom webhook system | 9 | ⏳ |
| Bandwidth optimization | Gzip + HTTP/2 | 10 | ⏳ |
| SSL/TLS | NGINX SSL | 11 | ⏳ |
| Analytics | Custom analytics service | 12 | ⏳ |
| Plan restrictions | Backend validation | 13 | ⏳ |
| Auto-scaling | Kubernetes HPA | 14 | ⏳ |
| Monitoring | Prometheus + Grafana | 15 | ⏳ |

---

## 🎯 Event System Migration

### Socket.io Events (No Change - Already Working)
- ✅ `viewer_count` - Real-time viewer count
- ✅ `new_message` - Chat messages
- ✅ `new_reaction` - Emoji reactions
- ✅ `viewer_joined` - Viewer join notifications
- ✅ `viewer_left` - Viewer leave notifications
- ✅ `camera_switched` - Multi-camera switching

### New NGINX Webhook Events
- `stream.started` - Stream goes live
- `stream.stopped` - Stream ends
- `stream.quality_changed` - Quality changes
- `viewer.joined` - Viewer starts watching (via HLS)
- `viewer.left` - Viewer stops watching
- `recording.started` - Recording begins
- `recording.completed` - Recording ready
- `camera.added` - New camera added
- `camera.removed` - Camera removed
- `error.occurred` - Stream error

---

## 🔧 Configuration Files Structure

```
/streaming-engine/
├── docker-compose.wedlive.yml
├── Dockerfile.wedlive
├── nginx-wedlive.conf
├── scripts/
│   ├── generate-stream-keys.sh
│   ├── setup-encryption.sh
│   ├── process-recordings.sh
│   └── health-check.sh
└── config/
    ├── qualities.json
    ├── plans.json
    └── webhooks.json

/backend/
└── app/
    ├── services/
    │   ├── nginx_stream_service.py
    │   ├── nginx_quality_service.py
    │   ├── encryption_service.py
    │   ├── recording_service.py
    │   ├── multi_camera_service.py
    │   ├── stats_service.py
    │   ├── load_balancer_service.py
    │   ├── cdn_service.py
    │   ├── webhook_dispatcher.py
    │   ├── compression_service.py
    │   ├── analytics_service.py
    │   ├── plan_enforcement_service.py
    │   └── scaling_service.py
    └── routes/
        ├── nginx_streams.py
        ├── nginx_webhooks.py
        ├── nginx_analytics.py
        └── nginx_admin.py
```

---

## 🚀 Deployment Strategy

### Development (Phase 1-5)
- Docker Compose on local machine
- Single NGINX instance
- Local storage for HLS/recordings
- Test with OBS Studio

### Staging (Phase 6-10)
- Kubernetes cluster (3 nodes)
- Multiple NGINX instances
- Shared NFS storage
- Test with multiple streams

### Production (Phase 11-15)
- Kubernetes cluster (auto-scaling)
- Load balancer + CDN
- Cloud storage (S3/EFS)
- Monitoring + alerting
- Full SSL/TLS

---

## ✅ Success Criteria

Each phase completion requires:
- [ ] Feature implemented and tested
- [ ] API endpoints functional
- [ ] Frontend integration working
- [ ] Unit tests passing
- [ ] Documentation updated
- [ ] No regression in existing features

---

## 📊 Estimated Timeline

- **Phase 1-3:** Weeks 1-2 (Core streaming)
- **Phase 4-6:** Weeks 2-3 (Recording + stats)
- **Phase 7-9:** Weeks 4-5 (Scaling + webhooks)
- **Phase 10-12:** Weeks 5-7 (Optimization + analytics)
- **Phase 13-15:** Weeks 7-8 (Production ready)

**Total: 8 weeks for complete migration**

---

## 🎬 Migration Approach

### Option A: Big Bang (Not Recommended)
- Switch entirely from GetStream.io to NGINX
- High risk, requires thorough testing

### Option B: Gradual Migration (Recommended)
1. Run both systems in parallel
2. Route 10% of new weddings to NGINX
3. Monitor for issues
4. Gradually increase to 100%
5. Deprecate GetStream.io

### Option C: Feature-by-Feature
1. Migrate basic streaming first
2. Add features incrementally
3. Keep GetStream.io as fallback
4. Complete migration when stable

---

**This comprehensive plan ensures WedLive can replace GetStream.io with a custom NGINX solution that's more cost-effective, customizable, and scalable!**
