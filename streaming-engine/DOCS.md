# 📚 Universal NGINX Streaming Engine - Complete Documentation

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Installation & Deployment](#installation--deployment)
3. [Configuration Reference](#configuration-reference)
4. [API Documentation](#api-documentation)
5. [Integration Patterns](#integration-patterns)
6. [Security Best Practices](#security-best-practices)
7. [Performance Tuning](#performance-tuning)
8. [Monitoring & Logging](#monitoring--logging)
9. [Troubleshooting](#troubleshooting)
10. [Production Deployment](#production-deployment)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     UNIVERSAL STREAMING ENGINE                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐       ┌──────────────┐      ┌─────────────┐ │
│  │ RTMP Ingest  │──────→│   FFmpeg     │─────→│ HLS Output  │ │
│  │  Port 1935   │       │  Transcoder  │      │  /tmp/hls   │ │
│  └──────────────┘       └──────────────┘      └─────────────┘ │
│         │                                             │         │
│         ↓                                             ↓         │
│  ┌──────────────┐                            ┌─────────────┐  │
│  │   Webhook    │                            │    HTTP     │  │
│  │    Auth      │                            │   Server    │  │
│  │  Port 8000   │                            │  Port 8080  │  │
│  └──────────────┘                            └─────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Ingestion**: RTMP stream arrives at `/live` application
2. **Authentication**: Webhook validates stream key
3. **Transcoding**: FFmpeg creates multiple quality variants
4. **Encryption**: HLS segments encrypted with AES-128
5. **Delivery**: HTTP server serves encrypted HLS playlist
6. **Playback**: Clients fetch and decrypt segments

### Key Features

| Feature | Implementation | Benefit |
|---------|---------------|----------|
| Adaptive Bitrate | FFmpeg multi-quality | Optimizes for bandwidth |
| HLS Encryption | AES-128 | Content protection |
| Webhook Auth | HTTP callbacks | Custom access control |
| Stateless Design | No local state | Horizontal scaling |
| Low Latency | 3s fragments | Near real-time |

---

## Installation & Deployment

### Local Development

#### Prerequisites
```bash
# macOS
brew install docker docker-compose

# Linux
sudo apt-get install docker.io docker-compose

# Windows
# Download Docker Desktop from docker.com
```

#### Quick Start
```bash
# 1. Clone/Copy the streaming-engine directory
cd streaming-engine

# 2. Create environment file
cp .env.example .env

# 3. Start services
docker-compose up --build

# 4. Verify
curl http://localhost:8080/health
```

### Docker Standalone

```bash
# Build image
docker build -t streaming-engine:latest .

# Run container
docker run -d \
  -p 1935:1935 \
  -p 8080:8080 \
  -e ALLOWED_STREAM_KEYS=demo,test \
  --name streaming \
  streaming-engine:latest
```

### Kubernetes Deployment

```yaml
# streaming-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: streaming-engine
spec:
  replicas: 3
  selector:
    matchLabels:
      app: streaming
  template:
    metadata:
      labels:
        app: streaming
    spec:
      containers:
      - name: streaming
        image: streaming-engine:latest
        ports:
        - containerPort: 1935
          name: rtmp
        - containerPort: 8080
          name: http
        env:
        - name: ALLOWED_STREAM_KEYS
          valueFrom:
            secretKeyRef:
              name: streaming-secrets
              key: stream-keys
        volumeMounts:
        - name: hls-storage
          mountPath: /tmp/hls
      volumes:
      - name: hls-storage
        persistentVolumeClaim:
          claimName: hls-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: streaming-service
spec:
  type: LoadBalancer
  ports:
  - port: 1935
    targetPort: 1935
    name: rtmp
  - port: 80
    targetPort: 8080
    name: http
  selector:
    app: streaming
```

Deploy:
```bash
kubectl apply -f streaming-deployment.yaml
kubectl get services streaming-service
```

### AWS ECS Deployment

```json
{
  "family": "streaming-engine",
  "containerDefinitions": [
    {
      "name": "streaming",
      "image": "your-registry/streaming-engine:latest",
      "memory": 2048,
      "cpu": 1024,
      "essential": true,
      "portMappings": [
        {"containerPort": 1935, "protocol": "tcp"},
        {"containerPort": 8080, "protocol": "tcp"}
      ],
      "environment": [
        {"name": "ALLOWED_STREAM_KEYS", "value": "stream1,stream2"},
        {"name": "HTTP_CALLBACK_URL", "value": "https://api.example.com"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/streaming-engine",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

---

## Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HLS_ENCRYPTION_KEY` | (auto) | 16-byte hex key for AES-128 |
| `ALLOWED_STREAM_KEYS` | demo,test,stream1 | Comma-separated valid keys |
| `WEBHOOK_SECRET` | your_secret_key_here | HMAC secret for webhooks |
| `HTTP_CALLBACK_URL` | http://webhook:8000 | Backend webhook endpoint |

### NGINX Configuration

#### RTMP Block
```nginx
rtmp {
    server {
        listen 1935;              # RTMP port
        chunk_size 4096;          # Chunk size in bytes
        
        application live {
            live on;              # Enable live streaming
            record off;           # Disable recording
            
            # Webhook callbacks
            on_publish http://webhook:8000/auth/publish;
            on_play http://webhook:8000/auth/play;
            on_publish_done http://webhook:8000/auth/publish_done;
            on_play_done http://webhook:8000/auth/play_done;
        }
    }
}
```

#### HTTP Block
```nginx
http {
    server {
        listen 8080;
        
        location /hls {
            types {
                application/vnd.apple.mpegurl m3u8;
                video/mp2t ts;
            }
            root /tmp;
            add_header Cache-Control no-cache;
            add_header Access-Control-Allow-Origin *;
        }
    }
}
```

### FFmpeg Transcoding Profiles

#### 1080p Profile
```bash
ffmpeg -i rtmp://localhost:1935/transcode/$name \
  -c:v libx264               # H.264 video codec
  -c:a aac                   # AAC audio codec
  -b:v 5000k                 # 5 Mbps video bitrate
  -b:a 192k                  # 192 kbps audio bitrate
  -vf "scale=1920:1080"      # Resolution
  -preset veryfast           # Encoding speed
  -tune zerolatency          # Low latency optimization
  -g 60                      # GOP size (2 seconds at 30fps)
  -sc_threshold 0            # Disable scene detection
  -f flv                     # Output format
  rtmp://localhost:1935/hls/$name_1080p
```

#### Custom Profile Template
```nginx
exec_push ffmpeg -i rtmp://localhost:1935/transcode/$name 
    -c:v libx264 -c:a aac 
    -b:v [BITRATE] -b:a [AUDIO_BITRATE] 
    -vf "scale=[WIDTH]:[HEIGHT]" 
    -preset [PRESET] 
    -g [GOP_SIZE] 
    -f flv rtmp://localhost:1935/hls/$name_[QUALITY];
```

**Preset Options**:
- `ultrafast`: Fastest, lowest quality
- `veryfast`: Good balance (recommended)
- `faster`: Better quality, slower
- `medium`: High quality, slow
- `slow`: Best quality, very slow

---

## API Documentation

### Webhook Handler Endpoints

#### POST /auth/publish
Validate stream publisher.

**Request** (form data from NGINX):
```
name=demo&addr=192.168.1.100&app=live
```

**Response**:
```json
{
  "status": "allowed",
  "stream_key": "demo"
}
```

**Status Codes**:
- `200 OK`: Stream allowed
- `403 Forbidden`: Invalid stream key
- `409 Conflict`: Stream already active

#### POST /auth/play
Validate stream viewer.

**Request**:
```
name=demo&addr=192.168.1.101
```

**Response**:
```json
{
  "status": "allowed",
  "stream_key": "demo"
}
```

#### GET /streams/active
List currently active streams.

**Response**:
```json
{
  "active_streams": {
    "demo": {
      "started_at": "2024-01-15T10:30:00",
      "client_ip": "192.168.1.100",
      "app": "live"
    }
  },
  "count": 1
}
```

#### GET /streams/stats
Get streaming statistics.

**Response**:
```json
{
  "stream_stats": {
    "demo": {
      "total_publishes": 10,
      "total_plays": 156,
      "last_publish": "2024-01-15T10:30:00",
      "last_play": "2024-01-15T12:45:00"
    }
  },
  "total_streams": 1
}
```

### RTMP Statistics

#### GET /stat
Real-time RTMP statistics (XML format).

**Response**:
```xml
<rtmp>
  <server>
    <application>
      <name>live</name>
      <live>
        <stream>
          <name>demo</name>
          <time>30000</time>
          <bw_in>2048000</bw_in>
          <bytes_in>7680000</bytes_in>
          <bw_out>1024000</bw_out>
          <bytes_out>3840000</bytes_out>
          <client>
            <address>192.168.1.100</address>
            <publishing/>
          </client>
        </stream>
      </live>
    </application>
  </server>
</rtmp>
```

---

## Integration Patterns

### Pattern 1: Direct Backend Integration

**Use Case**: Replace mock webhook handler with your backend.

**Steps**:
1. Update `docker-compose.yml`:
```yaml
environment:
  - HTTP_CALLBACK_URL=https://api.yourapp.com
```

2. Implement endpoints in your backend:
```python
# FastAPI example
from fastapi import FastAPI, Form, HTTPException
import os

app = FastAPI()

@app.post("/auth/publish")
async def auth_publish(name: str = Form(...), addr: str = Form(...)):
    # Check database for valid stream key
    stream = await db.streams.find_one({"key": name, "active": True})
    if not stream:
        raise HTTPException(status_code=403, detail="Invalid stream key")
    
    # Log event
    await db.events.insert_one({
        "type": "publish_start",
        "stream_key": name,
        "ip": addr,
        "timestamp": datetime.utcnow()
    })
    
    return {"status": "allowed"}
```

### Pattern 2: With Redis for State Management

**Use Case**: Share stream state across multiple instances.

```python
import redis

redis_client = redis.Redis(host='redis', port=6379, decode_responses=True)

@app.post("/auth/publish")
async def auth_publish(name: str = Form(...)):
    # Check if stream is already active (across all instances)
    if redis_client.exists(f"stream:active:{name}"):
        raise HTTPException(409, "Stream already active")
    
    # Mark as active with 1-hour TTL
    redis_client.setex(f"stream:active:{name}", 3600, "true")
    
    return {"status": "allowed"}

@app.post("/auth/publish_done")
async def auth_publish_done(name: str = Form(...)):
    redis_client.delete(f"stream:active:{name}")
    return {"status": "recorded"}
```

### Pattern 3: Frontend Integration

**React Example**:
```jsx
import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

function VideoPlayer({ streamKey }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  
  useEffect(() => {
    const video = videoRef.current;
    const streamUrl = `https://cdn.yourapp.com/hls/${streamKey}.m3u8`;
    
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30
      });
      
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play();
      });
      
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
    }
    
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [streamKey]);
  
  return (
    <video 
      ref={videoRef} 
      controls 
      autoPlay 
      muted
      style={{ width: '100%', maxWidth: '1280px' }}
    />
  );
}
```

### Pattern 4: CDN Integration (CloudFront)

**Steps**:

1. **Mount S3 bucket** (using s3fs-fuse):
```dockerfile
# Add to Dockerfile
RUN apk add --no-cache s3fs-fuse

# In entrypoint.sh
s3fs your-bucket /tmp/hls \
  -o iam_role=auto \
  -o use_cache=/tmp/s3cache
```

2. **Configure CloudFront**:
```
Origin: your-bucket.s3.amazonaws.com
Behaviors:
  - Path: /hls/*
    Origin: S3
    Viewer Protocol: HTTPS Only
    Cache Policy: CachingDisabled
```

3. **Update frontend**:
```javascript
const streamUrl = `https://d1234.cloudfront.net/hls/${streamKey}.m3u8`;
```

---

## Security Best Practices

### 1. Strong Encryption Keys

```bash
# Generate secure key
export HLS_ENCRYPTION_KEY=$(openssl rand -hex 16)

# Store in secrets management
aws secretsmanager create-secret \
  --name streaming/hls-key \
  --secret-string "$HLS_ENCRYPTION_KEY"
```

### 2. Webhook HMAC Verification

```python
import hmac
import hashlib

def verify_webhook(request, secret):
    signature = request.headers.get('X-NGINX-Signature')
    if not signature:
        raise HTTPException(403)
    
    body = await request.body()
    expected = hmac.new(
        secret.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(403)
```

Update `nginx.conf`:
```nginx
on_publish http://webhook:8000/auth/publish?sig=$arg_sig;
```

### 3. IP Whitelisting

```nginx
location /hls {
    # Allow specific IPs
    allow 192.168.1.0/24;
    allow 10.0.0.0/8;
    deny all;
    
    # ... rest of config
}
```

### 4. Rate Limiting

```nginx
http {
    limit_req_zone $binary_remote_addr zone=hls_limit:10m rate=10r/s;
    
    server {
        location /hls {
            limit_req zone=hls_limit burst=20;
            # ...
        }
    }
}
```

### 5. SSL/TLS Configuration

```nginx
server {
    listen 8443 ssl http2;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
    # Mozilla Intermediate Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
}
```

---

## Performance Tuning

### NGINX Workers

```nginx
worker_processes auto;  # One per CPU core
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    use epoll;            # Linux
    multi_accept on;
}
```

### FFmpeg Optimization

```nginx
# Use hardware acceleration (if available)
exec_push ffmpeg -hwaccel cuda -i rtmp://localhost:1935/transcode/$name \
    -c:v h264_nvenc \
    -preset p4 \
    -b:v 5000k \
    # ... rest of params
```

### Buffer Tuning

```nginx
http {
    client_body_buffer_size 128k;
    client_max_body_size 10m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 16k;
    output_buffers 1 32k;
    postpone_output 1460;
}
```

### Kernel Parameters

```bash
# /etc/sysctl.conf
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_tw_reuse = 1
net.ipv4.ip_local_port_range = 1024 65535
```

---

## Monitoring & Logging

### Prometheus Integration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'nginx'
    static_configs:
      - targets: ['streaming:9113']
```

Add nginx-prometheus-exporter:
```yaml
# docker-compose.yml
services:
  nginx-exporter:
    image: nginx/nginx-prometheus-exporter:latest
    command:
      - '-nginx.scrape-uri=http://streaming:8080/stat'
    ports:
      - "9113:9113"
```

### Grafana Dashboard

**Metrics to Track**:
- Active streams count
- Total bandwidth (in/out)
- Viewer count per stream
- FFmpeg CPU usage
- HLS segment generation rate
- Error rates

### Structured Logging

```nginx
http {
    log_format json_combined escape=json
        '{'
            '"time":"$time_iso8601",'
            '"remote_addr":"$remote_addr",'
            '"request":"$request",'
            '"status":$status,'
            '"body_bytes_sent":$body_bytes_sent,'
            '"http_referer":"$http_referer",'
            '"http_user_agent":"$http_user_agent"'
        '}';
    
    access_log /var/log/nginx/access.log json_combined;
}
```

---

## Troubleshooting

### Issue: Stream not accepting connections

**Diagnosis**:
```bash
# Check if NGINX is listening
docker-compose exec streaming netstat -tulpn | grep 1935

# Test RTMP connectivity
telnet localhost 1935
```

**Solutions**:
- Verify firewall rules: `sudo ufw allow 1935/tcp`
- Check NGINX logs: `docker-compose logs streaming`
- Validate nginx.conf: `docker-compose exec streaming nginx -t`

### Issue: HLS segments not generating

**Diagnosis**:
```bash
# Check HLS directory
docker-compose exec streaming ls -la /tmp/hls/

# Monitor FFmpeg processes
docker-compose exec streaming ps aux | grep ffmpeg

# Check FFmpeg errors
docker-compose logs streaming | grep ffmpeg
```

**Solutions**:
- Verify FFmpeg installation: `ffmpeg -version`
- Check disk space: `df -h`
- Ensure write permissions: `chmod 755 /tmp/hls`

### Issue: High latency

**Diagnosis**:
```bash
# Check fragment duration
curl http://localhost:8080/hls/demo.m3u8 | grep TARGETDURATION

# Monitor buffer sizes
curl http://localhost:8080/stat | grep buffer
```

**Solutions**:
```nginx
# Reduce fragment size
hls_fragment 2s;  # Default is 3s

# Reduce playlist length
hls_playlist_length 20s;  # Default is 60s

# Enable low latency mode
hls_type live;
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Change `WEBHOOK_SECRET` from default
- [ ] Generate secure `HLS_ENCRYPTION_KEY`
- [ ] Configure SSL/TLS certificates
- [ ] Set up log aggregation (ELK, Splunk)
- [ ] Configure monitoring (Prometheus/Grafana)
- [ ] Set up alerts for service failures
- [ ] Implement backup strategy for recordings
- [ ] Load test with expected concurrent streams
- [ ] Document recovery procedures
- [ ] Configure auto-scaling rules

### Load Balancer Configuration

**NGINX Load Balancer**:
```nginx
upstream rtmp_backend {
    least_conn;
    server stream1.example.com:1935 max_fails=3 fail_timeout=30s;
    server stream2.example.com:1935 max_fails=3 fail_timeout=30s;
    server stream3.example.com:1935 max_fails=3 fail_timeout=30s;
}

upstream http_backend {
    server stream1.example.com:8080;
    server stream2.example.com:8080;
    server stream3.example.com:8080;
}

server {
    listen 1935;
    proxy_pass rtmp_backend;
    proxy_timeout 3s;
    proxy_connect_timeout 1s;
}

server {
    listen 80;
    location / {
        proxy_pass http://http_backend;
        proxy_set_header Host $host;
    }
}
```

### Auto-Scaling (AWS)

```json
{
  "AutoScalingGroupName": "streaming-asg",
  "MinSize": 2,
  "MaxSize": 10,
  "DesiredCapacity": 3,
  "HealthCheckType": "ELB",
  "HealthCheckGracePeriod": 300,
  "TargetGroupARNs": ["arn:aws:elasticloadbalancing:..."],
  "Metrics": [
    {
      "Metric": "CPUUtilization",
      "TargetValue": 70.0,
      "ScaleOutCooldown": 300,
      "ScaleInCooldown": 600
    }
  ]
}
```

### Disaster Recovery

**Backup Strategy**:
```bash
#!/bin/bash
# backup-hls.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/hls/$DATE"

# Sync HLS files to S3
aws s3 sync /tmp/hls/ s3://your-backup-bucket/hls/$DATE/ \
  --storage-class GLACIER

# Keep last 7 days
find /backups/hls/ -type d -mtime +7 -exec rm -rf {} \;
```

**Restore Procedure**:
```bash
# Restore from S3
aws s3 sync s3://your-backup-bucket/hls/20240115_120000/ /tmp/hls/

# Restart services
docker-compose restart streaming
```

---

## Advanced Use Cases

### Multi-Region Deployment

```yaml
# Global Traffic Manager (AWS Route 53)
RecordSets:
  - Name: stream.example.com
    Type: A
    RoutingPolicy: Latency
    Regions:
      - us-east-1: lb-us-east.example.com
      - eu-west-1: lb-eu-west.example.com
      - ap-southeast-1: lb-ap-southeast.example.com
```

### DVR/Time-Shift Recording

```nginx
application live {
    live on;
    
    # Record all streams
    record all;
    record_path /tmp/rec;
    record_suffix -%Y%m%d-%H%M%S.flv;
    record_max_size 100M;
    record_max_frames 4;
    
    # Enable DVR playback
    play /tmp/rec;
}
```

### Pay-Per-View Integration

```python
@app.post("/auth/play")
async def auth_play(name: str = Form(...), token: str = Form(None)):
    # Verify payment token
    payment = await verify_payment_token(token)
    if not payment or not payment.is_valid():
        raise HTTPException(402, "Payment required")
    
    # Check access expiration
    if payment.expires_at < datetime.utcnow():
        raise HTTPException(403, "Access expired")
    
    return {"status": "allowed"}
```

---

**End of Documentation**

For updates and community support:
- GitHub: [Your repository]
- Docs: [Documentation site]
- Community: [Discord/Slack]