# Chat Integration Example

Implement real-time chat for your live streams.

## Features

- Real-time messaging
- Viewer count tracking
- Typing indicators
- Moderation tools
- Emoji reactions

## Implementation

### 1. Initialize Chat

```javascript
import { RealCastChat } from '@realcast/sdk';

const chat = new RealCastChat({
  streamId: 'stream_abc123',
  userId: 'user_xyz789',
  username: 'GamerPro',
  token: 'your_jwt_token'
});
```

### 2. Listen for Events

```javascript
// Connection events
chat.on('connect', () => {
  console.log('Connected to chat!');
});

chat.on('disconnect', () => {
  console.log('Disconnected from chat');
});

// Chat messages
chat.on('message', (data) => {
  console.log(`${data.username}: ${data.message}`);
  displayMessage(data);
});

// Viewer count
chat.on('viewer:count', (data) => {
  console.log('Viewers:', data.count);
  updateViewerCount(data.count);
});

// Typing indicator
chat.on('typing', (data) => {
  console.log(`${data.username} is typing...`);
  showTypingIndicator(data.username);
});

// Reactions
chat.on('reaction', (data) => {
  console.log(`${data.username} sent ${data.emoji}`);
  animateReaction(data.emoji, data.x, data.y);
});

// Moderation events
chat.on('user:banned', (data) => {
  if (data.userId === chat.userId) {
    alert('You have been banned');
    chat.disconnect();
  }
});

chat.on('user:muted', (data) => {
  if (data.userId === chat.userId) {
    disableChatInput(data.duration);
  }
});
```

### 3. Send Messages

```javascript
function sendMessage() {
  const input = document.getElementById('message-input');
  const message = input.value.trim();
  
  if (message) {
    chat.sendMessage(message);
    input.value = '';
  }
}

// Send typing indicator
let typingTimeout;
function onTyping() {
  clearTimeout(typingTimeout);
  
  chat.emit('typing', {
    streamId: chat.streamId,
    userId: chat.userId,
    username: chat.username
  });
  
  typingTimeout = setTimeout(() => {
    // Stop typing after 3 seconds
  }, 3000);
}
```

### 4. Send Reactions

```javascript
function sendReaction(emoji) {
  chat.sendReaction(emoji);
}

// Quick reactions
document.getElementById('like-btn').addEventListener('click', () => {
  sendReaction('👍');
});

document.getElementById('heart-btn').addEventListener('click', () => {
  sendReaction('❤️');
});

document.getElementById('fire-btn').addEventListener('click', () => {
  sendReaction('🔥');
});
```

## Complete HTML Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>RealCast Chat Example</title>
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 50px auto;
    }
    #chat-container {
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
    }
    #chat-header {
      background: #007bff;
      color: white;
      padding: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #viewer-count {
      background: rgba(255,255,255,0.2);
      padding: 5px 10px;
      border-radius: 4px;
    }
    #messages {
      height: 400px;
      overflow-y: auto;
      padding: 15px;
      background: #f5f5f5;
    }
    .message {
      margin-bottom: 10px;
      padding: 8px;
      background: white;
      border-radius: 4px;
    }
    .username {
      font-weight: bold;
      color: #007bff;
    }
    .timestamp {
      font-size: 0.8em;
      color: #999;
      margin-left: 10px;
    }
    #chat-input {
      display: flex;
      padding: 15px;
      border-top: 1px solid #ddd;
    }
    #message-box {
      flex: 1;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }
    #send-btn {
      margin-left: 10px;
      padding: 10px 20px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    #send-btn:hover {
      background: #0056b3;
    }
    #reactions {
      display: flex;
      gap: 10px;
      padding: 10px 15px;
      border-top: 1px solid #ddd;
    }
    .reaction-btn {
      font-size: 24px;
      border: none;
      background: none;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .reaction-btn:hover {
      transform: scale(1.3);
    }
    #typing-indicator {
      padding: 5px 15px;
      font-size: 0.9em;
      color: #666;
      font-style: italic;
      min-height: 20px;
    }
  </style>
</head>
<body>
  <div id="chat-container">
    <div id="chat-header">
      <h2>Live Chat</h2>
      <div id="viewer-count">👁️ 0 viewers</div>
    </div>
    
    <div id="messages"></div>
    
    <div id="typing-indicator"></div>
    
    <div id="reactions">
      <button class="reaction-btn" onclick="sendReaction('👍')">👍</button>
      <button class="reaction-btn" onclick="sendReaction('❤️')">❤️</button>
      <button class="reaction-btn" onclick="sendReaction('🔥')">🔥</button>
      <button class="reaction-btn" onclick="sendReaction('🎉')">🎉</button>
      <button class="reaction-btn" onclick="sendReaction('😂')">😂</button>
    </div>
    
    <div id="chat-input">
      <input
        id="message-box"
        type="text"
        placeholder="Type a message..."
        onkeypress="handleKeyPress(event)"
        oninput="handleTyping()"
      >
      <button id="send-btn" onclick="sendMessage()">Send</button>
    </div>
  </div>
  
  <script>
    // Configuration
    const STREAM_ID = 'stream_abc123';
    const USER_ID = 'user_' + Math.random().toString(36).substr(2, 9);
    const USERNAME = 'User' + Math.floor(Math.random() * 1000);
    
    // Connect to RealCast
    const socket = io('wss://realtime.realcast.io', {
      auth: {
        token: 'YOUR_JWT_TOKEN',
        app_id: 'YOUR_APP_ID'
      }
    });
    
    // Connection
    socket.on('connect', () => {
      console.log('Connected!');
      socket.emit('chat:join', {
        stream_id: STREAM_ID,
        user_id: USER_ID,
        username: USERNAME
      });
    });
    
    // Messages
    socket.on('chat:message', (data) => {
      displayMessage(data.username, data.message, data.timestamp);
    });
    
    // Viewer count
    socket.on('viewer.count.update', (data) => {
      document.getElementById('viewer-count').textContent = `👁️ ${data.count} viewers`;
    });
    
    // Typing
    let typingUsers = new Set();
    socket.on('chat:typing', (data) => {
      if (data.user_id !== USER_ID) {
        typingUsers.add(data.username);
        updateTypingIndicator();
        
        setTimeout(() => {
          typingUsers.delete(data.username);
          updateTypingIndicator();
        }, 3000);
      }
    });
    
    function updateTypingIndicator() {
      const indicator = document.getElementById('typing-indicator');
      if (typingUsers.size > 0) {
        const users = Array.from(typingUsers).join(', ');
        indicator.textContent = `${users} ${typingUsers.size === 1 ? 'is' : 'are'} typing...`;
      } else {
        indicator.textContent = '';
      }
    }
    
    // Display message
    function displayMessage(username, message, timestamp) {
      const messagesDiv = document.getElementById('messages');
      const messageDiv = document.createElement('div');
      messageDiv.className = 'message';
      
      const time = new Date(timestamp).toLocaleTimeString();
      messageDiv.innerHTML = `
        <span class="username">${username}:</span>
        ${message}
        <span class="timestamp">${time}</span>
      `;
      
      messagesDiv.appendChild(messageDiv);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    // Send message
    function sendMessage() {
      const input = document.getElementById('message-box');
      const message = input.value.trim();
      
      if (message) {
        socket.emit('chat:message', {
          stream_id: STREAM_ID,
          user_id: USER_ID,
          username: USERNAME,
          message: message
        });
        input.value = '';
      }
    }
    
    // Send reaction
    function sendReaction(emoji) {
      socket.emit('reaction:send', {
        stream_id: STREAM_ID,
        user_id: USER_ID,
        emoji: emoji
      });
    }
    
    // Typing indicator
    let typingTimeout;
    function handleTyping() {
      clearTimeout(typingTimeout);
      
      socket.emit('chat:typing', {
        stream_id: STREAM_ID,
        user_id: USER_ID,
        username: USERNAME
      });
      
      typingTimeout = setTimeout(() => {
        // Stopped typing
      }, 3000);
    }
    
    // Enter to send
    function handleKeyPress(event) {
      if (event.key === 'Enter') {
        sendMessage();
      }
    }
  </script>
</body>
</html>
```

## Run the Example

1. Replace placeholders:
   - `STREAM_ID`
   - `YOUR_JWT_TOKEN`
   - `YOUR_APP_ID`

2. Open in browser

3. Start chatting!

## Next Steps

- Add moderation UI for moderators
- Implement chat commands (/ban, /mute)
- Add emoji picker
- Save chat history
- Add user avatars
