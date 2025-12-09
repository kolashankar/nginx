# RealCast PaaS - API Documentation

## Overview

RealCast PaaS provides a comprehensive REST API for building live streaming applications. This document covers all available endpoints, authentication, and usage examples.

**Base URL:** `https://api.realcast.io/api`

**Current Version:** v1.0.0

---

## Table of Contents

1. [Authentication](#authentication)
2. [User Management](#user-management)
3. [App Management](#app-management)
4. [API Keys](#api-keys)
5. [Streams](#streams)
6. [Recordings & VOD](#recordings--vod)
7. [Webhooks](#webhooks)
8. [Analytics](#analytics)
9. [Billing](#billing)
10. [Team Collaboration](#team-collaboration)
11. [Monitoring](#monitoring)
12. [Error Codes](#error-codes)

---

## Authentication

### Register User

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "id": "usr_abc123",
  "email": "user@example.com",
  "name": "John Doe",
  "created_at": "2024-12-09T10:00:00Z"
}
```

### Login

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Get Current User

**Endpoint:** `GET /auth/me`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": "usr_abc123",
  "email": "user@example.com",
  "name": "John Doe",
  "created_at": "2024-12-09T10:00:00Z"
}
```

---

## App Management

### Create App

**Endpoint:** `POST /apps`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "My Gaming App",
  "description": "Live streaming for gaming community",
  "settings": {
    "max_bitrate": 6000,
    "allowed_origins": ["https://mygamingapp.com"]
  }
}
```

**Response:**
```json
{
  "id": "app_xyz789",
  "name": "My Gaming App",
  "description": "Live streaming for gaming community",
  "api_key": "ak_live_1234567890abcdef",
  "api_secret": "sk_live_abcdef1234567890",
  "created_at": "2024-12-09T10:00:00Z"
}
```

### List Apps

**Endpoint:** `GET /apps`

**Response:**
```json
[
  {
    "id": "app_xyz789",
    "name": "My Gaming App",
    "description": "Live streaming for gaming community",
    "created_at": "2024-12-09T10:00:00Z",
    "status": "active"
  }
]
```

### Get App Details

**Endpoint:** `GET /apps/{app_id}`

**Response:**
```json
{
  "id": "app_xyz789",
  "name": "My Gaming App",
  "description": "Live streaming for gaming community",
  "api_key": "ak_live_1234567890abcdef",
  "settings": {
    "max_bitrate": 6000,
    "allowed_origins": ["https://mygamingapp.com"]
  },
  "created_at": "2024-12-09T10:00:00Z",
  "status": "active"
}
```

---

## Streams

### Create Stream

**Endpoint:** `POST /streams`

**Request Body:**
```json
{
  "app_id": "app_xyz789",
  "title": "Epic Gaming Session",
  "description": "Playing the latest AAA game",
  "quality_preset": "high"
}
```

**Response:**
```json
{
  "id": "stream_abc123",
  "app_id": "app_xyz789",
  "stream_key": "live_abc123_def456",
  "ingest_url": "rtmps://ingest.realcast.io/live",
  "playback_url": "https://cdn.realcast.io/hls/stream_abc123.m3u8",
  "status": "offline",
  "created_at": "2024-12-09T10:00:00Z"
}
```

### Get Stream Status

**Endpoint:** `GET /streams/{stream_id}`

**Response:**
```json
{
  "id": "stream_abc123",
  "status": "live",
  "title": "Epic Gaming Session",
  "viewer_count": 1234,
  "duration": 3600,
  "started_at": "2024-12-09T10:00:00Z"
}
```

### Generate Playback Token

**Endpoint:** `POST /streams/{stream_id}/playback-token`

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "playback_url": "https://cdn.realcast.io/hls/stream_abc123.m3u8?token=...",
  "expires_in": 3600
}
```

---

## Recordings & VOD

### Start Recording

**Endpoint:** `POST /recordings/start`

**Request Body:**
```json
{
  "stream_id": "stream_abc123",
  "app_id": "app_xyz789",
  "stream_url": "rtmp://ingest.realcast.io/live/stream_abc123",
  "title": "Epic Gaming Session - VOD"
}
```

**Response:**
```json
{
  "recording_id": "rec_xyz789",
  "stream_id": "stream_abc123",
  "status": "recording",
  "started_at": "2024-12-09T10:00:00Z"
}
```

### Stop Recording

**Endpoint:** `POST /recordings/stop/{stream_id}`

**Response:**
```json
{
  "recording_id": "rec_xyz789",
  "status": "completed",
  "cdn_url": "https://cdn.telegram.org/file/BAACAgIAAxkBAAI...",
  "duration": 3600,
  "file_size": 524288000
}
```

### List Recordings

**Endpoint:** `GET /recordings/{app_id}`

**Response:**
```json
[
  {
    "id": "rec_xyz789",
    "title": "Epic Gaming Session - VOD",
    "cdn_url": "https://cdn.telegram.org/file/BAACAgIAAxkBAAI...",
    "duration": 3600,
    "created_at": "2024-12-09T10:00:00Z",
    "status": "completed"
  }
]
```

---

## Webhooks

### Configure Webhook

**Endpoint:** `POST /webhooks`

**Request Body:**
```json
{
  "app_id": "app_xyz789",
  "url": "https://api.mygamingapp.com/webhooks",
  "events": ["stream.live", "stream.offline", "viewer.joined"],
  "enabled": true
}
```

**Response:**
```json
{
  "id": "wh_abc123",
  "app_id": "app_xyz789",
  "url": "https://api.mygamingapp.com/webhooks",
  "events": ["stream.live", "stream.offline", "viewer.joined"],
  "enabled": true,
  "secret": "whsec_1234567890abcdef"
}
```

### Webhook Events

**Available Events:**
- `stream.live` - Stream went live
- `stream.offline` - Stream ended
- `stream.error` - Stream encountered an error
- `viewer.joined` - New viewer joined
- `viewer.left` - Viewer left
- `viewer.count.update` - Viewer count updated
- `chat.message.new` - New chat message
- `recording.started` - Recording started
- `recording.ready` - Recording is ready

**Webhook Payload Example:**
```json
{
  "event": "stream.live",
  "timestamp": "2024-12-09T10:00:00Z",
  "data": {
    "stream_id": "stream_abc123",
    "app_id": "app_xyz789",
    "title": "Epic Gaming Session"
  },
  "signature": "sha256=abc123..."
}
```

---

## Analytics

### Get App Analytics Overview

**Endpoint:** `GET /analytics/app/{app_id}/overview?days=7`

**Response:**
```json
{
  "app_id": "app_xyz789",
  "period_days": 7,
  "streams": {
    "total": 45,
    "total_duration_seconds": 162000,
    "average_duration_seconds": 3600
  },
  "viewers": {
    "total_views": 55000,
    "average_concurrent": 1222
  },
  "recordings": {
    "total": 30,
    "total_size_gb": 150.5
  },
  "webhooks": {
    "total_deliveries": 1250,
    "failed_deliveries": 5,
    "success_rate": 99.6
  }
}
```

### Get Bandwidth Usage

**Endpoint:** `GET /analytics/app/{app_id}/bandwidth?days=7`

**Response:**
```json
{
  "app_id": "app_xyz789",
  "period_days": 7,
  "total_bandwidth_gb": 5500.25,
  "total_bandwidth_tb": 5.37,
  "estimated_cost_usd": 550.03
}
```

---

## Billing

### Get Subscription Plans

**Endpoint:** `GET /billing/plans`

**Response:**
```json
{
  "plans": {
    "free": {
      "name": "Free",
      "price_usd": 0,
      "max_streams": 1,
      "max_concurrent_viewers": 50,
      "bandwidth_gb": 100
    },
    "starter": {
      "name": "Starter",
      "price_usd": 29,
      "max_streams": 5,
      "max_concurrent_viewers": 500,
      "bandwidth_gb": 500
    },
    "pro": {
      "name": "Pro",
      "price_usd": 99,
      "max_streams": 20,
      "max_concurrent_viewers": 2000,
      "bandwidth_gb": 2000
    }
  }
}
```

### Create Subscription

**Endpoint:** `POST /billing/subscription`

**Request Body:**
```json
{
  "tier": "pro",
  "payment_method_id": "pm_1234567890"
}
```

---

## Team Collaboration

### Invite Team Member

**Endpoint:** `POST /teams/invite`

**Request Body:**
```json
{
  "email": "teammate@example.com",
  "role": "admin",
  "app_id": "app_xyz789"
}
```

**Roles:**
- `owner` - Full access
- `admin` - Manage app settings and content
- `editor` - Create and manage streams
- `viewer` - Read-only access

---

## Monitoring

### Health Check

**Endpoint:** `GET /monitoring/health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-09T10:00:00Z",
  "services": {
    "mongodb": {"status": "healthy"},
    "redis": {"status": "healthy"}
  },
  "system": {
    "cpu_percent": 45.2,
    "memory_percent": 62.8,
    "disk_percent": 38.5
  }
}
```

### Get Metrics

**Endpoint:** `GET /monitoring/metrics`

**Response:**
```json
{
  "timestamp": "2024-12-09T10:00:00Z",
  "database": {
    "total_users": 1250,
    "total_apps": 3500,
    "total_streams": 45000,
    "total_recordings": 12000
  },
  "realtime": {
    "active_streams": 150
  }
}
```

---

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists or is in use |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error occurred |
| 503 | Service Unavailable | Service temporarily unavailable |

---

## Rate Limiting

All API endpoints are rate limited:
- **60 requests per minute** per API key
- **1000 requests per hour** per API key

Rate limit headers are included in every response:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1638360000
```

---

## Support

For API support:
- Email: api@realcast.io
- Docs: https://docs.realcast.io
- Status: https://status.realcast.io
