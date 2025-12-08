# 🎬 Universal NGINX Streaming Microservice

A production-ready, Docker-based streaming engine with **Netflix-like features**: Adaptive Bitrate (ABR), HLS encryption, webhook authentication, and horizontal scalability.

## ✨ Features

### Core Capabilities
- **RTMP Ingestion**: Accept streams from OBS, FFmpeg, or any RTMP encoder
- **Adaptive Bitrate (ABR)**: Automatic multi-quality transcoding (1080p, 720p, 480p, 360p)
- **HLS Delivery**: Industry-standard HTTP Live Streaming with low latency
- **AES-128 Encryption**: Secure content delivery with encrypted HLS segments
- **Webhook Authentication**: Token-based publish/play authentication
- **Stateless Architecture**: Deploy multiple instances behind a load balancer
- **Real-time Statistics**: Monitor active streams and viewer metrics

### Technology Stack
- **NGINX 1.25.3** compiled from source
- **nginx-rtmp-module 1.2.2** for RTMP support
- **FFmpeg** for real-time transcoding
- **FastAPI** mock webhook handler (Python 3.11)
- **Alpine Linux** for minimal footprint

## 🚀 Quick Start

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- 4GB+ RAM recommended for transcoding

### 1. Clone and Setup

```bash
cd streaming-engine
cp .env.example .env
```

### 2. Configure Environment (Optional)

Edit `.env` to customize:
```bash
# Allow specific stream keys
ALLOWED_STREAM_KEYS=mystream,demo,test

# Custom encryption key (or leave empty for auto-generation)
HLS_ENCRYPTION_KEY=

# Webhook authentication secret
WEBHOOK_SECRET=your_secret_here
```

### 3. Launch Services

```bash
docker-compose up --build
```

Services will start:
- **RTMP Server**: `rtmp://localhost:1935`
- **HLS Playback**: `http://localhost:8080`
- **Webhook Handler**: `http://localhost:8000`

### 4. Start Streaming

#### Using OBS Studio:
1. **Settings → Stream**
   - Service: Custom
   - Server: `rtmp://localhost:1935/live`
   - Stream Key: `demo` (or any key from `ALLOWED_STREAM_KEYS`)
2. Click **Start Streaming**

#### Using FFmpeg:
```bash
ffmpeg -re -i input.mp4 -c:v libx264 -c:a aac -f flv rtmp://localhost:1935/live/demo
```

### 5. Watch Stream

Open browser: `http://localhost:8080`

Or directly access HLS:
```bash
http://localhost:8080/hls/demo.m3u8
```

## 📡 Architecture

```
┌─────────────┐     RTMP      ┌──────────────────┐
│   Encoder   │──────────────→│  NGINX RTMP      │
│  (OBS/FFmpeg)│   Port 1935   │  + Webhook Auth  │
└─────────────┘               └──────────────────┘
                                      │
                                      ↓ FFmpeg Transcoding
                              ┌──────────────────┐
                              │  HLS Generator   │
                              │  Multi-Quality   │
                              │  + Encryption    │
                              └──────────────────┘
                                      │
                                      ↓ HLS Segments
                              ┌──────────────────┐
                              │   HTTP Server    │
                              │   Port 8080      │
                              └──────────────────┘
                                      │
                                      ↓ HLS/HTTPS
                              ┌──────────────────┐
                              │   Video Player   │
                              │   (Browser/App)  │
                              └──────────────────┘

                   Webhook Handler (Port 8000)
                   ├── /auth/publish (validate stream key)
                   ├── /auth/play (viewer authentication)
                   └── /streams/active (monitoring)
```

## 🔐 Security Features

### 1. HLS Encryption (AES-128)
All HLS segments are encrypted automatically. Keys are:
- Auto-generated on container start (default)
- Or provided via `HLS_ENCRYPTION_KEY` environment variable

### 2. Webhook Authentication

**Publish Authentication** (`on_publish`):
```python
# Webhook receives:
- name: stream_key
- addr: client_ip
- app: application_name

# Return 200 to allow, 403 to deny
```

**Play Authentication** (`on_play`):
```python
# Implement viewer access control
# Check subscription, tokens, geo-restrictions, etc.
```

### 3. Secure Link (Optional)
Uncomment in `nginx.conf` to enable token-based URL authentication:
```nginx
secure_link $arg_md5,$arg_expires;
secure_link_md5 "$secure_link_expires$uri changeme_in_production";
```

Generate secure URLs:
```python
import hashlib
import time

expires = int(time.time()) + 3600  # 1 hour
uri = "/hls/demo.m3u8"
secret = "changeme_in_production"
md5 = hashlib.md5(f"{expires}{uri} {secret}".encode()).hexdigest()

url = f"http://localhost:8080{uri}?md5={md5}&expires={expires}"
```

## 🎯 Webhook Handler API

### Endpoints

#### Health Check
```bash
GET http://localhost:8000/health
```

#### Active Streams
```bash
GET http://localhost:8000/streams/active

Response:
{
  "active_streams": {
    "demo": {
      "started_at": "2024-01-15T10:30:00",
      "client_ip": "172.18.0.1",
      "app": "live"
    }
  },
  "count": 1
}
```

#### Stream Statistics
```bash
GET http://localhost:8000/streams/stats

Response:
{
  "stream_stats": {
    "demo": {
      "total_publishes": 5,
      "total_plays": 42,
      "last_publish": "2024-01-15T10:30:00",
      "last_play": "2024-01-15T10:35:00"
    }
  }
}
```

#### Stream Details
```bash
GET http://localhost:8000/streams/demo
```

## 📊 Monitoring

### NGINX RTMP Statistics
Access real-time stats: `http://localhost:8080/stat`

Shows:
- Active streams
- Bandwidth usage
- Connected clients
- Frame rates
- Codec information

### Container Health Checks
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f streaming
docker-compose logs -f webhook

# Webhook handler logs
curl http://localhost:8000/streams/active
```

## 🔧 Configuration

### Custom NGINX Configuration

Mount custom config in `docker-compose.yml`:
```yaml
volumes:
  - ./custom-nginx.conf:/etc/nginx/nginx.conf:ro
```

### Quality Profiles

Edit `nginx.conf` to adjust transcoding:
```nginx
# Example: Add 4K support
exec_push ffmpeg -i rtmp://localhost:1935/transcode/$name 
    -c:v libx264 -c:a aac -b:v 15000k -b:a 256k 
    -vf "scale=3840:2160" -preset veryfast 
    -g 60 -sc_threshold 0 
    -f flv rtmp://localhost:1935/hls/$name_4k;
```

### FFmpeg Presets
- `ultrafast`: Lowest CPU, lowest quality
- `veryfast`: Balanced (default)
- `medium`: Higher quality, more CPU
- `slow`: Best quality, highest CPU

## 🌐 Integration Guide

### With Any Backend

1. **Replace Webhook Handler**:
   ```yaml
   # docker-compose.yml
   environment:
     - HTTP_CALLBACK_URL=http://your-backend.com
   ```

2. **Implement Endpoints**:
   ```python
   # Your backend
   @app.post("/auth/publish")
   async def auth_publish(name: str, addr: str):
       # Validate stream_key against database
       if is_valid(name):
           return {"status": "allowed"}
       raise HTTPException(403)
   ```

3. **Frontend Integration**:
   ```javascript
   // React/Vue/Angular
   import Hls from 'hls.js';
   
   const video = document.getElementById('video');
   const hls = new Hls();
   hls.loadSource(`https://your-cdn.com/hls/${streamKey}.m3u8`);
   hls.attachMedia(video);
   ```

### CDN Integration

#### With CloudFlare Stream
```nginx
# Push to CloudFlare
exec_push ffmpeg -i rtmp://localhost:1935/live/$name 
    -f flv rtmp://live.cloudflare.com/live/$cf_stream_key;
```

#### With AWS CloudFront
1. Store HLS files in S3:
   ```nginx
   hls_path /mnt/s3-bucket/hls;
   ```
2. Configure CloudFront to serve from S3
3. Use signed URLs for private content

## 📈 Scalability

### Horizontal Scaling

1. **Deploy Multiple Instances**:
   ```bash
   docker-compose up --scale streaming=3
   ```

2. **Add Load Balancer** (NGINX example):
   ```nginx
   upstream rtmp_backend {
       least_conn;
       server streaming1:1935;
       server streaming2:1935;
       server streaming3:1935;
   }
   
   server {
       listen 1935;
       proxy_pass rtmp_backend;
   }
   ```

3. **Shared Storage**:
   ```yaml
   volumes:
     - nfs-share:/tmp/hls  # NFS/EFS for shared HLS files
   ```

### Production Considerations

- **Redis**: Store active stream states across instances
- **PostgreSQL**: Persist stream metadata and analytics
- **S3/Object Storage**: Store HLS segments for CDN delivery
- **Message Queue**: Webhook events processing (RabbitMQ/Kafka)
- **Prometheus**: Metrics collection and alerting

## 🐛 Troubleshooting

### Stream Not Starting
```bash
# Check NGINX logs
docker-compose logs streaming | grep error

# Check webhook authentication
curl -X POST http://localhost:8000/auth/publish \
  -F "name=demo" -F "addr=127.0.0.1"
```

### Playback Issues
```bash
# Verify HLS generation
ls -la /tmp/hls/  # Inside container

# Test HLS directly
ffplay http://localhost:8080/hls/demo.m3u8

# Check CORS headers
curl -I http://localhost:8080/hls/demo.m3u8
```

### High CPU Usage
- Reduce quality profiles (disable 1080p)
- Change FFmpeg preset to `ultrafast`
- Increase fragment duration: `hls_fragment 6s;`
- Disable unnecessary variants

### Memory Issues
```nginx
# Reduce buffer sizes in nginx.conf
client_body_buffer_size 128k;
large_client_header_buffers 4 16k;
```

## 📦 Docker Commands

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart specific service
docker-compose restart streaming

# Execute commands inside container
docker-compose exec streaming sh

# Remove volumes (clean slate)
docker-compose down -v
```

## 🔒 Production Deployment

### SSL/TLS Setup

1. **Add certificates**:
   ```yaml
   volumes:
     - ./ssl/cert.pem:/etc/nginx/ssl/cert.pem:ro
     - ./ssl/key.pem:/etc/nginx/ssl/key.pem:ro
   ```

2. **Update nginx.conf**:
   ```nginx
   server {
       listen 8443 ssl http2;
       ssl_certificate /etc/nginx/ssl/cert.pem;
       ssl_certificate_key /etc/nginx/ssl/key.pem;
       ssl_protocols TLSv1.2 TLSv1.3;
   }
   ```

### Environment Variables

```bash
# .env for production
HLS_ENCRYPTION_KEY=$(openssl rand -hex 16)
WEBHOOK_SECRET=$(openssl rand -hex 32)
ALLOWED_STREAM_KEYS=prod-stream-1,prod-stream-2
HTTP_CALLBACK_URL=https://api.yourcompany.com
```

## 📝 License

MIT License - Free to use in commercial projects

## 🤝 Contributing

This is a universal template. Customize freely for your use case!

## 📧 Support

For issues or questions:
1. Check logs: `docker-compose logs`
2. Review NGINX docs: https://nginx.org/en/docs/
3. RTMP module: https://github.com/arut/nginx-rtmp-module

---

**Built with ❤️ for the streaming community**