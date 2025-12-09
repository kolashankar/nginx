# RealCast PaaS - Quick Start Guide

## Welcome to RealCast! 🚀

Get your live streaming app up and running in under 10 minutes.

---

## Step 1: Create an Account (2 minutes)

1. Visit [https://dashboard.realcast.io](https://dashboard.realcast.io)
2. Click **Sign Up**
3. Enter your email and create a password
4. Verify your email address

---

## Step 2: Create Your First App (1 minute)

1. Log in to your dashboard
2. Click **Create New App**
3. Enter app details:
   - **Name:** "My Streaming App"
   - **Description:** "My first live streaming application"
4. Click **Create**

**You'll receive:**
- API Key: `ak_live_1234567890abcdef`
- API Secret: `sk_live_abcdef1234567890`

> ⚠️ **Important:** Keep your API Secret secure! Never expose it in client-side code.

---

## Step 3: Create a Stream (1 minute)

### Via Dashboard:
1. Go to **Streams** tab
2. Click **Create Stream**
3. Fill in details:
   - **Title:** "My First Stream"
   - **Quality:** High (1080p)
4. Copy your **Stream Key** and **Ingest URL**

### Via API:
```bash
curl -X POST https://api.realcast.io/api/streams \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "app_xyz789",
    "title": "My First Stream",
    "quality_preset": "high"
  }'
```

---

## Step 4: Start Streaming (3 minutes)

### Option A: Stream with OBS Studio

1. **Download OBS:** [obsproject.com](https://obsproject.com/)
2. **Configure OBS:**
   - Settings → Stream
   - Service: Custom
   - Server: `rtmps://ingest.realcast.io/live`
   - Stream Key: `live_abc123_def456`
3. **Start Streaming:** Click "Start Streaming"

### Option B: Stream with FFmpeg

```bash
ffmpeg -i video.mp4 -c:v libx264 -c:a aac \
  -f flv rtmps://ingest.realcast.io/live/YOUR_STREAM_KEY
```

---

## Step 5: Watch Your Stream (1 minute)

### Via Browser:

Open this URL in your browser:
```
https://cdn.realcast.io/hls/stream_abc123.m3u8
```

### Via VLC:
1. Open VLC Media Player
2. Media → Open Network Stream
3. Paste your playback URL
4. Click Play

### Embed in Your Website:

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
</head>
<body>
  <video id="video" controls width="100%"></video>
  <script>
    const video = document.getElementById('video');
    const hls = new Hls();
    hls.loadSource('https://cdn.realcast.io/hls/stream_abc123.m3u8');
    hls.attachMedia(video);
  </script>
</body>
</html>
```

---

## Step 6: Add Live Chat (2 minutes)

```javascript
import io from 'socket.io-client';

// Connect to RealCast real-time server
const socket = io('https://realtime.realcast.io', {
  auth: {
    userId: 'user_123',
    userName: 'John Doe'
  }
});

// Join stream chat
socket.emit('join_channel', { channel_id: 'stream_abc123' });

// Listen for messages
socket.on('chat_message', (data) => {
  console.log(`${data.user_name}: ${data.message}`);
});

// Send message
socket.emit('send_message', {
  channel_id: 'stream_abc123',
  message: 'Hello everyone!'
});
```

---

## What's Next?

### Add Advanced Features:

✅ **Webhooks** - Get notified of stream events
```javascript
// Receive webhook when stream goes live
POST https://yourapp.com/webhook
{
  "event": "stream.live",
  "data": {
    "stream_id": "stream_abc123",
    "title": "My First Stream"
  }
}
```

✅ **Analytics** - Track viewers and engagement
```bash
curl https://api.realcast.io/api/analytics/app/YOUR_APP_ID/overview \
  -H "Authorization: Bearer YOUR_API_KEY"
```

✅ **Recording & VOD** - Save streams automatically
```bash
curl -X POST https://api.realcast.io/api/recordings/start \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "stream_id": "stream_abc123",
    "app_id": "app_xyz789"
  }'
```

---

## Common Use Cases

### 1. Gaming Platform
```javascript
// Create stream for gamer
const stream = await createStream({
  title: `${gamer.name}'s Gameplay`,
  game: 'Fortnite',
  quality: 'high'
});

// Show in-game overlay with viewer count
setInterval(async () => {
  const data = await getStreamData(stream.id);
  updateOverlay(data.viewer_count);
}, 5000);
```

### 2. Education Platform
```javascript
// Create class session
const stream = await createStream({
  title: 'Math 101 - Algebra Basics',
  recording: true,  // Save for students who missed it
  chat: {
    slowMode: 5,  // 5 seconds between messages
    moderators: ['teacher_id']
  }
});
```

### 3. Events & Conferences
```javascript
// Multi-stream event
const streams = await Promise.all([
  createStream({ title: 'Main Stage' }),
  createStream({ title: 'Workshop Room A' }),
  createStream({ title: 'Workshop Room B' })
]);

// Get combined viewer count
const totalViewers = streams.reduce(
  (sum, s) => sum + s.viewer_count, 0
);
```

---

## Troubleshooting

### Stream won't start?
- ✅ Check your stream key is correct
- ✅ Verify internet upload speed (minimum 5 Mbps)
- ✅ Ensure port 1935 is not blocked
- ✅ Try non-secure RTMP first: `rtmp://` instead of `rtmps://`

### Can't see the stream?
- ✅ Wait 5-10 seconds after starting stream
- ✅ Check stream status in dashboard
- ✅ Verify playback URL is correct
- ✅ Try a different browser or player

### Poor quality?
- ✅ Lower OBS bitrate (try 3000 kbps)
- ✅ Change CPU preset to "veryfast"
- ✅ Close bandwidth-heavy apps
- ✅ Use wired connection instead of WiFi

---

## Getting Help

📧 **Email:** support@realcast.io

📚 **Documentation:** [docs.realcast.io](https://docs.realcast.io)

💬 **Discord:** [discord.gg/realcast](https://discord.gg/realcast)

🐛 **Report Issues:** [github.com/realcast/issues](https://github.com/realcast/issues)

---

## Pricing

### Free Tier
- 1 concurrent stream
- 50 concurrent viewers
- 100 GB bandwidth/month
- Basic analytics

### Starter - $29/month
- 5 concurrent streams
- 500 concurrent viewers
- 500 GB bandwidth/month
- Recording & VOD
- Advanced analytics

### Pro - $99/month
- 20 concurrent streams
- 2,000 concurrent viewers
- 2 TB bandwidth/month
- All Starter features
- Custom transcoding
- Priority support

### Enterprise - Custom
- Unlimited streams
- Unlimited viewers
- Unlimited bandwidth
- White-label solution
- Dedicated support
- SLA guarantee

[View detailed pricing →](https://realcast.io/pricing)

---

## Welcome aboard! 🎉

You're now ready to build amazing streaming experiences with RealCast!

**Next steps:**
- [Complete Integration Guide →](./guides/REACT_INTEGRATION.md)
- [API Reference →](./API.md)
- [Best Practices →](./BEST_PRACTICES.md)
