# RealCast PaaS - WebSocket API Reference

## Overview

RealCast's Real-Time Engine provides WebSocket connectivity for chat, live events, and real-time analytics. Built on Socket.IO for reliability and automatic reconnection.

**WebSocket URL:** `wss://realtime.realcast.io`

**Protocol:** Socket.IO v4.x

---

## Connection

### JavaScript/TypeScript

```javascript
import { io } from 'socket.io-client';

const socket = io('wss://realtime.realcast.io', {
  auth: {
    token: 'your_jwt_token',
    app_id: 'app_xyz789'
  },
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('Connected to RealCast');
});

socket.on('disconnect', () => {
  console.log('Disconnected from RealCast');
});
```

### Python

```python
import socketio

sio = socketio.Client()

@sio.on('connect')
def on_connect():
    print('Connected to RealCast')
    sio.emit('authenticate', {
        'token': 'your_jwt_token',
        'app_id': 'app_xyz789'
    })

sio.connect('wss://realtime.realcast.io')
```

---

## Authentication

Authentication happens during connection or immediately after:

```javascript
// Option 1: Auth during connection (recommended)
const socket = io('wss://realtime.realcast.io', {
  auth: { token: jwt_token, app_id: app_id }
});

// Option 2: Auth after connection
socket.emit('authenticate', {
  token: jwt_token,
  app_id: app_id
});

socket.on('authenticated', (data) => {
  console.log('Authenticated as:', data.user_id);
});

socket.on('unauthorized', (error) => {
  console.error('Authentication failed:', error.message);
});
```

---

## Chat Events

### Join Chat Room

```javascript
socket.emit('chat:join', {
  stream_id: 'stream_qwe456',
  user_id: 'user_abc123',
  username: 'GamerPro'
});

socket.on('chat:joined', (data) => {
  console.log('Joined chat:', data.stream_id);
  console.log('Online users:', data.online_users);
});
```

### Send Message

```javascript
socket.emit('chat:message', {
  stream_id: 'stream_qwe456',
  message: 'Hello everyone! 👋',
  user_id: 'user_abc123',
  username: 'GamerPro'
});
```

### Receive Messages

```javascript
socket.on('chat:message', (data) => {
  console.log(`${data.username}: ${data.message}`);
  // data structure:
  // {
  //   message_id: 'msg_123',
  //   stream_id: 'stream_qwe456',
  //   user_id: 'user_abc123',
  //   username: 'GamerPro',
  //   message: 'Hello everyone! 👋',
  //   timestamp: '2024-12-09T10:00:00Z'
  // }
});
```

### Typing Indicator

```javascript
// Start typing
socket.emit('chat:typing', {
  stream_id: 'stream_qwe456',
  user_id: 'user_abc123',
  username: 'GamerPro'
});

// Listen for typing
socket.on('chat:typing', (data) => {
  console.log(`${data.username} is typing...`);
});
```

### Leave Chat

```javascript
socket.emit('chat:leave', {
  stream_id: 'stream_qwe456',
  user_id: 'user_abc123'
});
```

---

## Stream Events

### Subscribe to Stream Events

```javascript
socket.emit('stream:subscribe', {
  stream_id: 'stream_qwe456'
});

socket.on('stream:subscribed', (data) => {
  console.log('Subscribed to stream:', data.stream_id);
});
```

### Stream Status Events

```javascript
// Stream went live
socket.on('stream.live', (data) => {
  console.log('Stream is now live!');
  // data: { stream_id, title, started_at }
});

// Stream ended
socket.on('stream.offline', (data) => {
  console.log('Stream ended');
  // data: { stream_id, duration, ended_at }
});

// Stream error
socket.on('stream.error', (data) => {
  console.error('Stream error:', data.error);
});
```

### Viewer Count Updates

```javascript
socket.on('viewer.count.update', (data) => {
  console.log('Viewers:', data.count);
  // data: { stream_id, count, timestamp }
});
```

---

## Moderation Events

### Ban User

```javascript
socket.emit('moderation:ban', {
  stream_id: 'stream_qwe456',
  target_user_id: 'user_xyz789',
  reason: 'Spam',
  duration: 3600 // seconds, null for permanent
});

socket.on('user.banned', (data) => {
  console.log('User banned:', data.user_id);
});
```

### Mute User

```javascript
socket.emit('moderation:mute', {
  stream_id: 'stream_qwe456',
  target_user_id: 'user_xyz789',
  duration: 300 // seconds
});

socket.on('user.muted', (data) => {
  console.log('User muted:', data.user_id, 'for', data.duration, 'seconds');
});
```

### Delete Message

```javascript
socket.emit('moderation:delete-message', {
  stream_id: 'stream_qwe456',
  message_id: 'msg_123'
});

socket.on('chat.message.deleted', (data) => {
  console.log('Message deleted:', data.message_id);
});
```

### Slow Mode

```javascript
socket.emit('moderation:slow-mode', {
  stream_id: 'stream_qwe456',
  enabled: true,
  interval: 5 // seconds between messages
});

socket.on('chat.slow-mode', (data) => {
  console.log('Slow mode:', data.enabled, 'interval:', data.interval);
});
```

---

## Reactions

### Send Reaction

```javascript
socket.emit('reaction:send', {
  stream_id: 'stream_qwe456',
  emoji: '👍',
  user_id: 'user_abc123'
});
```

### Receive Reactions

```javascript
socket.on('reaction.sent', (data) => {
  // Animate reaction on screen
  console.log('Reaction:', data.emoji, 'from', data.user_id);
  // data: { stream_id, emoji, user_id, x, y, timestamp }
});
```

---

## Analytics Events

### Request Analytics

```javascript
socket.emit('analytics:subscribe', {
  stream_id: 'stream_qwe456'
});

socket.on('analytics:update', (data) => {
  console.log('Analytics:', data);
  // data: {
  //   stream_id: 'stream_qwe456',
  //   viewers: 1234,
  //   peak_viewers: 2000,
  //   messages_per_minute: 45,
  //   reactions_per_minute: 120,
  //   average_watch_time: 1800
  // }
});
```

---

## Error Handling

```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error.message);
  // error types:
  // - 'authentication_failed'
  // - 'rate_limit_exceeded'
  // - 'invalid_request'
  // - 'permission_denied'
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log('Reconnection attempt:', attemptNumber);
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
});
```

---

## Complete Chat Example

```javascript
import { io } from 'socket.io-client';

class RealCastChat {
  constructor(streamId, userId, username, token) {
    this.streamId = streamId;
    this.userId = userId;
    this.username = username;
    
    this.socket = io('wss://realtime.realcast.io', {
      auth: { token, app_id: 'app_xyz789' }
    });
    
    this.setupListeners();
  }
  
  setupListeners() {
    this.socket.on('connect', () => {
      console.log('Connected!');
      this.joinChat();
    });
    
    this.socket.on('chat:message', (data) => {
      this.displayMessage(data);
    });
    
    this.socket.on('chat:typing', (data) => {
      this.showTypingIndicator(data.username);
    });
    
    this.socket.on('viewer.count.update', (data) => {
      this.updateViewerCount(data.count);
    });
    
    this.socket.on('user.banned', (data) => {
      if (data.user_id === this.userId) {
        this.handleBan();
      }
    });
  }
  
  joinChat() {
    this.socket.emit('chat:join', {
      stream_id: this.streamId,
      user_id: this.userId,
      username: this.username
    });
  }
  
  sendMessage(message) {
    this.socket.emit('chat:message', {
      stream_id: this.streamId,
      user_id: this.userId,
      username: this.username,
      message: message
    });
  }
  
  sendReaction(emoji) {
    this.socket.emit('reaction:send', {
      stream_id: this.streamId,
      user_id: this.userId,
      emoji: emoji
    });
  }
  
  disconnect() {
    this.socket.emit('chat:leave', {
      stream_id: this.streamId,
      user_id: this.userId
    });
    this.socket.disconnect();
  }
  
  displayMessage(data) {
    // Implement your UI logic
    console.log(`${data.username}: ${data.message}`);
  }
  
  showTypingIndicator(username) {
    // Implement typing indicator UI
    console.log(`${username} is typing...`);
  }
  
  updateViewerCount(count) {
    // Update viewer count UI
    console.log(`Viewers: ${count}`);
  }
  
  handleBan() {
    alert('You have been banned from this chat');
    this.disconnect();
  }
}

// Usage
const chat = new RealCastChat(
  'stream_qwe456',
  'user_abc123',
  'GamerPro',
  'your_jwt_token'
);

// Send message
chat.sendMessage('Hello everyone!');

// Send reaction
chat.sendReaction('👍');
```

---

## Event Summary

### Chat Events
- `chat:join` - Join a chat room
- `chat:leave` - Leave a chat room
- `chat:message` - Send/receive messages
- `chat:typing` - Typing indicators
- `chat:joined` - Confirmation of join
- `chat:slow-mode` - Slow mode status
- `chat:message.deleted` - Message deletion notification

### Stream Events
- `stream:subscribe` - Subscribe to stream events
- `stream.live` - Stream started
- `stream.offline` - Stream ended
- `stream.error` - Stream error
- `viewer.count.update` - Viewer count changes
- `viewer.joined` - New viewer joined
- `viewer.left` - Viewer left

### Moderation Events
- `moderation:ban` - Ban user
- `moderation:unban` - Unban user
- `moderation:mute` - Mute user
- `moderation:unmute` - Unmute user
- `moderation:delete-message` - Delete message
- `moderation:slow-mode` - Toggle slow mode
- `user.banned` - User ban notification
- `user.unbanned` - User unban notification
- `user.muted` - User mute notification

### Reaction Events
- `reaction:send` - Send reaction
- `reaction.sent` - Reaction notification

### Analytics Events
- `analytics:subscribe` - Subscribe to analytics
- `analytics:update` - Analytics data update

---

## Rate Limiting

WebSocket events are rate limited per connection:

- **Chat messages:** 5 per second, 100 per minute
- **Reactions:** 10 per second, 300 per minute
- **Moderation actions:** 20 per minute

Exceeding rate limits triggers an `error` event:

```javascript
socket.on('error', (error) => {
  if (error.type === 'rate_limit_exceeded') {
    console.log('Rate limit exceeded, retry after:', error.retry_after);
  }
});
```

---

## Best Practices

1. **Always handle disconnections** - Implement reconnection logic
2. **Validate messages** - Sanitize user input before sending
3. **Use typing indicators sparingly** - Debounce keystrokes
4. **Implement message queuing** - Handle network interruptions gracefully
5. **Show connection status** - Display online/offline indicator to users
6. **Optimize reactions** - Batch or throttle reaction animations
7. **Handle errors** - Display user-friendly error messages

---

## Support

For questions or issues:
- Documentation: https://docs.realcast.io/websocket
- Email: support@realcast.io
