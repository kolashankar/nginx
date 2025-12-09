# RealCast PaaS - Quick Start Guide

Get started with RealCast in 15 minutes! This guide will walk you through creating your first live streaming app.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create an Account](#step-1-create-an-account)
3. [Step 2: Create Your First App](#step-2-create-your-first-app)
4. [Step 3: Generate API Keys](#step-3-generate-api-keys)
5. [Step 4: Create a Stream](#step-4-create-a-stream)
6. [Step 5: Start Streaming (OBS)](#step-5-start-streaming-obs)
7. [Step 6: Build a Player](#step-6-build-a-player)
8. [Step 7: Add Chat](#step-7-add-chat)
9. [Next Steps](#next-steps)

---

## Prerequisites

- Basic knowledge of REST APIs
- Node.js or Python environment (for SDK)
- OBS Studio (for streaming)
- Text editor or IDE

---

## Step 1: Create an Account

### Using cURL

```bash
curl -X POST https://api.realcast.io/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "SecurePass123!",
    "full_name": "Your Name"
  }'
```

### Using JavaScript SDK

```javascript
import { RealCastAPI } from '@realcast/sdk';

const api = new RealCastAPI();

const user = await api.auth.register({
  email: 'your@email.com',
  password: 'SecurePass123!',
  fullName: 'Your Name'
});

console.log('User created:', user.id);
```

### Response

```json
{
  "id": "user_abc123",
  "email": "your@email.com",
  "full_name": "Your Name",
  "created_at": "2024-12-09T10:00:00Z"
}
```

---

## Step 2: Create Your First App

Login to get your access token:

```bash
curl -X POST https://api.realcast.io/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "SecurePass123!"
  }'
```

Save the `access_token` from the response.

Now create an app:

```bash
curl -X POST https://api.realcast.io/api/apps \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First App",
    "description": "Testing RealCast",
    "settings": {
      "recording_enabled": true,
      "chat_enabled": true
    }
  }'
```

**Response:**

```json
{
  "id": "app_xyz789",
  "name": "My First App",
  "description": "Testing RealCast",
  "user_id": "user_abc123",
  "created_at": "2024-12-09T10:00:00Z"
}
```

✅ Save the `app_id` - you'll need it!

---

## Step 3: Generate API Keys

```bash
curl -X POST https://api.realcast.io/api/api-keys \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "app_xyz789",
    "name": "Production Key",
    "scopes": ["streams:read", "streams:write", "chat:write"]
  }'
```

**Response:**

```json
{
  "id": "key_mno789",
  "app_id": "app_xyz789",
  "api_key": "rck_live_abc123def456ghi789",
  "api_secret": "rcs_live_xyz123abc456def789",
  "created_at": "2024-12-09T10:00:00Z"
}
```

⚠️ **IMPORTANT:** Save `api_secret` - it's only shown once!

---

## Step 4: Create a Stream

```bash
curl -X POST https://api.realcast.io/api/streams \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "app_xyz789",
    "title": "My First Stream",
    "description": "Testing live streaming"
  }'
```

**Response:**

```json
{
  "id": "stream_qwe456",
  "app_id": "app_xyz789",
  "title": "My First Stream",
  "stream_key": "app_xyz789_stream_qwe456_sk_abc123def456",
  "rtmp_url": "rtmps://ingest.realcast.io/live",
  "hls_url": "https://cdn.realcast.io/hls/stream_qwe456.m3u8",
  "status": "created",
  "created_at": "2024-12-09T10:00:00Z"
}
```

✅ Save the `stream_key` and `hls_url`!

---

## Step 5: Start Streaming (OBS)

1. **Open OBS Studio**

2. **Go to Settings > Stream**

3. **Configure:**
   - Service: `Custom`
   - Server: `rtmps://ingest.realcast.io/live`
   - Stream Key: `app_xyz789_stream_qwe456_sk_abc123def456`

4. **Click "Start Streaming"**

🎉 Your stream is now live!

### Verify Stream Status

```bash
curl -X GET https://api.realcast.io/api/streams/stream_qwe456/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**

```json
{
  "stream_id": "stream_qwe456",
  "status": "live",
  "viewer_count": 0,
  "started_at": "2024-12-09T10:05:00Z"
}
```

---

## Step 6: Build a Player

Create `player.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>RealCast Player</title>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <style>
    body {
      margin: 0;
      background: #000;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }
    video {
      width: 80%;
      max-width: 1280px;
    }
  </style>
</head>
<body>
  <video id="video" controls autoplay></video>
  
  <script>
    const video = document.getElementById('video');
    const hlsUrl = 'https://cdn.realcast.io/hls/stream_qwe456.m3u8';
    
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('Stream loaded!');
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Error:', data);
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = hlsUrl;
    }
  </script>
</body>
</html>
```

Open `player.html` in your browser - you should see your live stream!

---

## Step 7: Add Chat

Add chat to your player:

```html
<!DOCTYPE html>
<html>
<head>
  <title>RealCast Player with Chat</title>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
  <style>
    body {
      margin: 0;
      background: #000;
      display: flex;
      height: 100vh;
      font-family: Arial, sans-serif;
    }
    #player {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    video {
      width: 100%;
      max-width: 1280px;
    }
    #chat {
      width: 300px;
      background: #1a1a1a;
      display: flex;
      flex-direction: column;
    }
    #messages {
      flex: 1;
      overflow-y: auto;
      padding: 10px;
      color: white;
    }
    .message {
      margin-bottom: 10px;
    }
    .username {
      font-weight: bold;
      color: #00aaff;
    }
    #chat-input {
      display: flex;
      padding: 10px;
      background: #2a2a2a;
    }
    #message-box {
      flex: 1;
      padding: 8px;
      border: none;
      background: #3a3a3a;
      color: white;
      border-radius: 4px;
    }
    #send-btn {
      margin-left: 10px;
      padding: 8px 16px;
      background: #00aaff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div id="player">
    <video id="video" controls autoplay></video>
  </div>
  
  <div id="chat">
    <div id="messages"></div>
    <div id="chat-input">
      <input id="message-box" type="text" placeholder="Type a message...">
      <button id="send-btn">Send</button>
    </div>
  </div>
  
  <script>
    // Video player setup
    const video = document.getElementById('video');
    const hlsUrl = 'https://cdn.realcast.io/hls/stream_qwe456.m3u8';
    
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
    }
    
    // Chat setup
    const socket = io('wss://realtime.realcast.io', {
      auth: {
        token: 'YOUR_JWT_TOKEN',
        app_id: 'app_xyz789'
      }
    });
    
    const streamId = 'stream_qwe456';
    const userId = 'user_' + Math.random().toString(36).substr(2, 9);
    const username = 'User' + Math.floor(Math.random() * 1000);
    
    socket.on('connect', () => {
      console.log('Connected to chat');
      socket.emit('chat:join', {
        stream_id: streamId,
        user_id: userId,
        username: username
      });
    });
    
    socket.on('chat:message', (data) => {
      displayMessage(data.username, data.message);
    });
    
    function displayMessage(username, message) {
      const messagesDiv = document.getElementById('messages');
      const messageDiv = document.createElement('div');
      messageDiv.className = 'message';
      messageDiv.innerHTML = `<span class="username">${username}:</span> ${message}`;
      messagesDiv.appendChild(messageDiv);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    function sendMessage() {
      const input = document.getElementById('message-box');
      const message = input.value.trim();
      
      if (message) {
        socket.emit('chat:message', {
          stream_id: streamId,
          user_id: userId,
          username: username,
          message: message
        });
        input.value = '';
      }
    }
    
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    document.getElementById('message-box').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  </script>
</body>
</html>
```

🎉 You now have a complete live streaming app with chat!

---

## Next Steps

### Add Webhooks

Get notified when streams start/stop:

```bash
curl -X POST https://api.realcast.io/api/webhooks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "app_xyz789",
    "url": "https://your-app.com/webhooks",
    "events": ["stream.live", "stream.offline"],
    "secret": "your_webhook_secret"
  }'
```

### Enable Recording

Automatically record streams:

```bash
curl -X POST https://api.realcast.io/api/recordings/start \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stream_id": "stream_qwe456",
    "app_id": "app_xyz789",
    "stream_url": "rtmp://localhost/live/stream_qwe456"
  }'
```

### Use SDKs

Install official SDKs for easier integration:

```bash
# JavaScript/TypeScript
npm install @realcast/sdk

# Python
pip install realcast-sdk

# React
npm install @realcast/react
```

### Explore More

- 📚 [Full API Documentation](./API.md)
- 🔌 [WebSocket Events](./WEBSOCKET.md)
- ⚙️ [Integration Guides](./guides/)
- 💻 [Code Examples](./examples/)

---

## Troubleshooting

### Stream not starting?

1. Check stream key is correct
2. Verify RTMP URL: `rtmps://ingest.realcast.io/live`
3. Check firewall allows outbound port 1935
4. Review OBS logs for errors

### Player not working?

1. Check HLS URL is accessible
2. Open browser console for errors
3. Verify CORS headers are set
4. Test in different browser

### Chat not connecting?

1. Verify JWT token is valid
2. Check WebSocket URL
3. Review browser console for errors
4. Ensure app_id is correct

---

## Support

Need help?

- 📚 Documentation: https://docs.realcast.io
- 💬 Discord: https://discord.gg/realcast
- 📧 Email: support@realcast.io
- 🐛 Issues: https://github.com/realcast/issues

---

Congratulations! You've built your first live streaming app with RealCast! 🎉
