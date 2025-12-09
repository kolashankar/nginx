# RealCast PaaS - API Reference

## Overview

RealCast PaaS provides a comprehensive RESTful API for managing live streaming, real-time chat, and video-on-demand services. This document covers all available endpoints, authentication methods, and usage examples.

**Base URL:** `https://api.realcast.io/api`

**API Version:** 1.0.0

---

## Table of Contents

1. [Authentication](#authentication)
2. [Apps](#apps)
3. [Streams](#streams)
4. [API Keys](#api-keys)
5. [Webhooks](#webhooks)
6. [Recordings](#recordings)
7. [Transcoding Profiles](#transcoding-profiles)
8. [Audit Logs](#audit-logs)
9. [Error Codes](#error-codes)
10. [Rate Limiting](#rate-limiting)

---

## Authentication

### Register User

```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "developer@example.com",
  "password": "SecurePass123!",
  "full_name": "John Developer"
}
```

**Response (201):**
```json
{
  "id": "user_abc123",
  "email": "developer@example.com",
  "full_name": "John Developer",
  "created_at": "2024-12-09T10:00:00Z"
}
```

### Login

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "developer@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "user_abc123",
    "email": "developer@example.com",
    "full_name": "John Developer"
  }
}
```

### Get Current User

```http
GET /api/auth/me
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "id": "user_abc123",
  "email": "developer@example.com",
  "full_name": "John Developer",
  "created_at": "2024-12-09T10:00:00Z"
}
```

---

## Apps

Apps represent individual projects or applications in the RealCast platform. Each app has its own API keys, streams, and configuration.

### Create App

```http
POST /api/apps
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "name": "My Gaming App",
  "description": "Live streaming platform for gamers",
  "settings": {
    "recording_enabled": true,
    "chat_enabled": true
  }
}
```

**Response (201):**
```json
{
  "id": "app_xyz789",
  "name": "My Gaming App",
  "description": "Live streaming platform for gamers",
  "user_id": "user_abc123",
  "settings": {
    "recording_enabled": true,
    "chat_enabled": true
  },
  "created_at": "2024-12-09T10:00:00Z"
}
```

### List Apps

```http
GET /api/apps
Authorization: Bearer {access_token}
```

**Response (200):**
```json
[
  {
    "id": "app_xyz789",
    "name": "My Gaming App",
    "description": "Live streaming platform for gamers",
    "created_at": "2024-12-09T10:00:00Z"
  }
]
```

### Get App Details

```http
GET /api/apps/{app_id}
Authorization: Bearer {access_token}
```

### Update App

```http
PUT /api/apps/{app_id}
Authorization: Bearer {access_token}
```

### Delete App

```http
DELETE /api/apps/{app_id}
Authorization: Bearer {access_token}
```

---

## Streams

### Create Stream

```http
POST /api/streams
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "app_id": "app_xyz789",
  "title": "Epic Gaming Session",
  "description": "Playing the latest AAA title",
  "settings": {
    "recording": true,
    "transcoding_profile_id": "profile_123"
  }
}
```

**Response (201):**
```json
{
  "id": "stream_qwe456",
  "app_id": "app_xyz789",
  "title": "Epic Gaming Session",
  "stream_key": "app_xyz789_stream_qwe456_sk_abc123def456",
  "rtmp_url": "rtmps://ingest.realcast.io/live",
  "hls_url": "https://cdn.realcast.io/hls/stream_qwe456.m3u8",
  "status": "created",
  "created_at": "2024-12-09T10:00:00Z"
}
```

### Start Streaming (OBS Configuration)

**RTMP URL:** `rtmps://ingest.realcast.io/live`

**Stream Key:** Use the `stream_key` from the create stream response

### Generate Playback Token

```http
POST /api/streams/{stream_id}/playback-token
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "viewer_id": "viewer_123",
  "expiry_minutes": 60
}
```

**Response (200):**
```json
{
  "playback_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "playback_url": "https://cdn.realcast.io/hls/stream_qwe456.m3u8?token=eyJ...",
  "expires_at": "2024-12-09T11:00:00Z"
}
```

### Get Stream Status

```http
GET /api/streams/{stream_id}/status
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "stream_id": "stream_qwe456",
  "status": "live",
  "viewer_count": 1234,
  "started_at": "2024-12-09T10:00:00Z",
  "duration_seconds": 3600
}
```

---

## API Keys

### Generate API Key

```http
POST /api/api-keys
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "app_id": "app_xyz789",
  "name": "Production Key",
  "scopes": ["streams:read", "streams:write", "chat:write"]
}
```

**Response (201):**
```json
{
  "id": "key_mno789",
  "app_id": "app_xyz789",
  "name": "Production Key",
  "api_key": "rck_live_abc123def456ghi789",
  "api_secret": "rcs_live_xyz123abc456def789",
  "scopes": ["streams:read", "streams:write", "chat:write"],
  "created_at": "2024-12-09T10:00:00Z"
}
```

⚠️ **Important:** The `api_secret` is only shown once. Store it securely!

### List API Keys

```http
GET /api/api-keys?app_id={app_id}
Authorization: Bearer {access_token}
```

### Regenerate API Secret

```http
POST /api/api-keys/{key_id}/regenerate
Authorization: Bearer {access_token}
```

### Delete API Key

```http
DELETE /api/api-keys/{key_id}
Authorization: Bearer {access_token}
```

---

## Webhooks

### Configure Webhook

```http
POST /api/webhooks
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "app_id": "app_xyz789",
  "url": "https://your-app.com/webhooks/realcast",
  "events": [
    "stream.live",
    "stream.offline",
    "chat.message.new",
    "viewer.count.update"
  ],
  "secret": "your_webhook_secret_key"
}
```

**Response (201):**
```json
{
  "id": "webhook_stu012",
  "app_id": "app_xyz789",
  "url": "https://your-app.com/webhooks/realcast",
  "events": ["stream.live", "stream.offline"],
  "status": "active",
  "created_at": "2024-12-09T10:00:00Z"
}
```

### Webhook Event Payload

When an event occurs, RealCast will POST to your webhook URL:

```json
{
  "id": "evt_abc123",
  "type": "stream.live",
  "app_id": "app_xyz789",
  "stream_id": "stream_qwe456",
  "timestamp": "2024-12-09T10:00:00Z",
  "data": {
    "stream_key": "app_xyz789_stream_qwe456_sk_abc123def456",
    "title": "Epic Gaming Session",
    "client_ip": "192.168.1.100"
  }
}
```

**Signature Verification:**

Each webhook request includes an `X-Webhook-Signature` header with HMAC-SHA256 signature:

```python
import hmac
import hashlib

def verify_webhook(payload, signature, secret):
    expected = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)
```

---

## Recordings

### Start Recording

```http
POST /api/recordings/start
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "stream_id": "stream_qwe456",
  "app_id": "app_xyz789",
  "stream_url": "rtmp://localhost/live/stream_qwe456",
  "title": "Gaming Session VOD",
  "description": "Full recording of epic gameplay"
}
```

### Stop Recording

```http
POST /api/recordings/stop/{stream_id}
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "id": "rec_vwx345",
  "stream_id": "stream_qwe456",
  "status": "completed",
  "cdn_url": "https://cdn.telegram.org/file/BAACAgIAAxkBAAI123456789",
  "duration": 3600,
  "file_size": 524288000,
  "completed_at": "2024-12-09T11:00:00Z"
}
```

### List Recordings

```http
GET /api/recordings/?app_id={app_id}&limit=50&skip=0
Authorization: Bearer {access_token}
```

---

## Transcoding Profiles

### Create Transcoding Profile

```http
POST /api/transcoding-profiles
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "app_id": "app_xyz789",
  "name": "HD Gaming Profile",
  "description": "Optimized for 60fps gaming",
  "qualities": [
    {"name": "1080p60", "width": 1920, "height": 1080, "bitrate": 6000, "fps": 60},
    {"name": "720p60", "width": 1280, "height": 720, "bitrate": 3500, "fps": 60},
    {"name": "480p30", "width": 854, "height": 480, "bitrate": 1200, "fps": 30}
  ],
  "audio_bitrate": 192,
  "enable_gpu_acceleration": true
}
```

---

## Audit Logs

### List Audit Logs

```http
GET /api/audit-logs?app_id={app_id}&days=7&limit=100
Authorization: Bearer {access_token}
```

**Response (200):**
```json
[
  {
    "id": "log_123456",
    "user_id": "user_abc123",
    "app_id": "app_xyz789",
    "action": "create_stream",
    "resource_type": "stream",
    "resource_id": "stream_qwe456",
    "ip_address": "192.168.1.100",
    "status": "success",
    "timestamp": "2024-12-09T10:00:00Z"
  }
]
```

### Get Security Events

```http
GET /api/audit-logs/security-events?days=7
Authorization: Bearer {access_token}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Resource created |
| 400 | Bad request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Access denied |
| 404 | Not found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 429 | Too many requests - Rate limit exceeded |
| 500 | Internal server error |
| 503 | Service unavailable |

**Error Response Format:**
```json
{
  "detail": "Error message describing what went wrong",
  "status_code": 400
}
```

---

## Rate Limiting

API requests are rate limited to prevent abuse:

- **Standard tier:** 60 requests/minute, 1000 requests/hour
- **Stream operations:** 10 requests/minute, 100 requests/hour

Rate limit headers are included in every response:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1702123456
```

When rate limited, you'll receive a `429` response:

```json
{
  "detail": "Rate limit exceeded. Maximum 60 requests per minute.",
  "retry_after": 60
}
```

---

## Pagination

List endpoints support pagination using `limit` and `skip` parameters:

```http
GET /api/streams?app_id={app_id}&limit=50&skip=0
```

- `limit`: Number of items to return (max 100)
- `skip`: Number of items to skip

---

## Best Practices

1. **Always use HTTPS** for API requests
2. **Store API secrets securely** - Never commit them to version control
3. **Implement webhook signature verification** to ensure authenticity
4. **Handle rate limits** with exponential backoff
5. **Use pagination** for large result sets
6. **Monitor audit logs** for suspicious activity
7. **Rotate API keys** regularly

---

## Support

For questions or issues:
- Documentation: https://docs.realcast.io
- Email: support@realcast.io
- Discord: https://discord.gg/realcast
