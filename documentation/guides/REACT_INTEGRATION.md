# React Integration Guide for RealCast

Complete guide to integrating RealCast live streaming and chat into your React application.

---

## Installation

```bash
npm install @realcast/react @realcast/sdk hls.js socket.io-client
# or
yarn add @realcast/react @realcast/sdk hls.js socket.io-client
```

---

## Quick Start

### 1. Setup RealCast Provider

```jsx
import { RealCastProvider } from '@realcast/react';
import App from './App';

function Root() {
  return (
    <RealCastProvider
      apiKey="your_api_key"
      apiSecret="your_api_secret"
      appId="your_app_id"
    >
      <App />
    </RealCastProvider>
  );
}

export default Root;
```

### 2. Use RealCast Hooks

```jsx
import { useRealCast, useStream, useChat } from '@realcast/react';

function StreamPage() {
  const { api } = useRealCast();
  const { stream, createStream, startStream } = useStream();
  const { messages, sendMessage, viewers } = useChat(stream?.id);
  
  const handleCreateStream = async () => {
    await createStream({
      title: 'My Live Stream',
      description: 'React integration demo'
    });
  };
  
  return (
    <div>
      <button onClick={handleCreateStream}>Create Stream</button>
      {stream && (
        <div>
          <h2>{stream.title}</h2>
          <p>Stream Key: {stream.streamKey}</p>
          <p>Viewers: {viewers}</p>
        </div>
      )}
    </div>
  );
}
```

---

## Components

### VideoPlayer Component

```jsx
import { VideoPlayer } from '@realcast/react';

function WatchPage({ streamId }) {
  return (
    <VideoPlayer
      streamId={streamId}
      autoPlay
      controls
      muted={false}
      onPlay={() => console.log('Playing')}
      onPause={() => console.log('Paused')}
      onError={(error) => console.error(error)}
    />
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `streamId` | string | required | Stream ID to play |
| `autoPlay` | boolean | false | Auto-play on load |
| `controls` | boolean | true | Show player controls |
| `muted` | boolean | false | Start muted |
| `className` | string | '' | CSS class name |
| `style` | object | {} | Inline styles |
| `onPlay` | function | - | Play event handler |
| `onPause` | function | - | Pause event handler |
| `onError` | function | - | Error handler |

### ChatWidget Component

```jsx
import { ChatWidget } from '@realcast/react';

function StreamWithChat({ streamId }) {
  return (
    <div style={{ display: 'flex' }}>
      <VideoPlayer streamId={streamId} />
      <ChatWidget
        streamId={streamId}
        username="GamerPro"
        userId="user_123"
        maxHeight="600px"
        theme="dark"
        onMessageSent={(msg) => console.log('Sent:', msg)}
      />
    </div>
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `streamId` | string | required | Stream ID |
| `username` | string | required | User's display name |
| `userId` | string | required | User ID |
| `maxHeight` | string | '500px' | Max height of chat |
| `theme` | 'light' \| 'dark' | 'dark' | Chat theme |
| `showViewerCount` | boolean | true | Show viewer count |
| `enableEmojis` | boolean | true | Enable emoji picker |
| `onMessageSent` | function | - | Message sent callback |
| `onMessageReceived` | function | - | Message received callback |

---

## Hooks

### useRealCast

Access RealCast API client and configuration.

```jsx
import { useRealCast } from '@realcast/react';

function MyComponent() {
  const { api, appId, isConnected } = useRealCast();
  
  // Use api to make requests
  const createApp = async () => {
    const app = await api.apps.create({ name: 'New App' });
    console.log(app);
  };
  
  return <div>Connected: {isConnected ? 'Yes' : 'No'}</div>;
}
```

### useStream

Manage streams.

```jsx
import { useStream } from '@realcast/react';

function StreamManager() {
  const {
    stream,
    streams,
    loading,
    error,
    createStream,
    getStream,
    updateStream,
    deleteStream,
    getStatus
  } = useStream();
  
  const handleCreate = async () => {
    await createStream({
      title: 'New Stream',
      description: 'My stream description'
    });
  };
  
  const handleDelete = async (streamId) => {
    await deleteStream(streamId);
  };
  
  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      <button onClick={handleCreate}>Create Stream</button>
      {streams.map(s => (
        <div key={s.id}>
          <h3>{s.title}</h3>
          <button onClick={() => handleDelete(s.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

### useChat

Manage real-time chat.

```jsx
import { useChat } from '@realcast/react';

function ChatComponent({ streamId }) {
  const {
    messages,
    viewers,
    isConnected,
    sendMessage,
    sendReaction,
    typing,
    startTyping,
    stopTyping
  } = useChat(streamId, {
    userId: 'user_123',
    username: 'GamerPro'
  });
  
  const [input, setInput] = useState('');
  
  const handleSend = () => {
    sendMessage(input);
    setInput('');
  };
  
  const handleTyping = () => {
    startTyping();
    setTimeout(stopTyping, 3000);
  };
  
  return (
    <div>
      <div>Viewers: {viewers}</div>
      <div>
        {messages.map(msg => (
          <div key={msg.id}>
            <strong>{msg.username}:</strong> {msg.message}
          </div>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          handleTyping();
        }}
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
```

### useRecording

Manage recordings.

```jsx
import { useRecording } from '@realcast/react';

function RecordingManager({ streamId }) {
  const {
    recording,
    recordings,
    isRecording,
    startRecording,
    stopRecording,
    deleteRecording
  } = useRecording(streamId);
  
  return (
    <div>
      {!isRecording ? (
        <button onClick={startRecording}>Start Recording</button>
      ) : (
        <button onClick={stopRecording}>Stop Recording</button>
      )}
      
      <h3>Recordings</h3>
      {recordings.map(rec => (
        <div key={rec.id}>
          <a href={rec.cdnUrl}>{rec.title}</a>
          <button onClick={() => deleteRecording(rec.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

---

## Complete Example: Live Streaming App

```jsx
import React, { useState } from 'react';
import {
  RealCastProvider,
  useStream,
  useChat,
  VideoPlayer,
  ChatWidget
} from '@realcast/react';

function StreamDashboard() {
  const { stream, createStream, loading } = useStream();
  const [showPlayer, setShowPlayer] = useState(false);
  
  const handleCreateStream = async () => {
    await createStream({
      title: 'My React Stream',
      description: 'Streaming from React app'
    });
  };
  
  if (loading) return <div>Loading...</div>;
  
  if (!stream) {
    return (
      <div>
        <h1>Create Your Stream</h1>
        <button onClick={handleCreateStream}>Create Stream</button>
      </div>
    );
  }
  
  return (
    <div>
      <h1>Stream Dashboard</h1>
      
      <div style={{ background: '#f5f5f5', padding: '20px', marginBottom: '20px' }}>
        <h2>Stream Configuration</h2>
        <p><strong>Title:</strong> {stream.title}</p>
        <p><strong>RTMP URL:</strong> <code>{stream.rtmpUrl}</code></p>
        <p><strong>Stream Key:</strong> <code>{stream.streamKey}</code></p>
        <button onClick={() => setShowPlayer(!showPlayer)}>
          {showPlayer ? 'Hide' : 'Show'} Player
        </button>
      </div>
      
      {showPlayer && (
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ flex: 2 }}>
            <VideoPlayer
              streamId={stream.id}
              autoPlay
              controls
            />
          </div>
          <div style={{ flex: 1 }}>
            <ChatWidget
              streamId={stream.id}
              username="Streamer"
              userId="user_123"
              theme="dark"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <RealCastProvider
      apiKey="your_api_key"
      apiSecret="your_api_secret"
      appId="your_app_id"
    >
      <StreamDashboard />
    </RealCastProvider>
  );
}

export default App;
```

---

## Advanced Features

### Custom Player

Build your own player with low-level hooks:

```jsx
import { usePlayer } from '@realcast/react';
import Hls from 'hls.js';
import { useRef, useEffect } from 'react';

function CustomPlayer({ streamId }) {
  const videoRef = useRef(null);
  const { hlsUrl, status } = usePlayer(streamId);
  
  useEffect(() => {
    if (!hlsUrl || !videoRef.current) return;
    
    const hls = new Hls();
    hls.loadSource(hlsUrl);
    hls.attachMedia(videoRef.current);
    
    return () => hls.destroy();
  }, [hlsUrl]);
  
  return (
    <div>
      <video ref={videoRef} controls autoPlay />
      <div>Status: {status}</div>
    </div>
  );
}
```

### Moderation

```jsx
import { useModeration } from '@realcast/react';

function ModerationPanel({ streamId }) {
  const {
    banUser,
    unbanUser,
    muteUser,
    deleteMessage,
    setSlowMode
  } = useModeration(streamId);
  
  return (
    <div>
      <button onClick={() => banUser('user_123', 3600)}>
        Ban User (1 hour)
      </button>
      <button onClick={() => muteUser('user_123', 300)}>
        Mute User (5 min)
      </button>
      <button onClick={() => setSlowMode(true, 5)}>
        Enable Slow Mode (5s)
      </button>
    </div>
  );
}
```

### Analytics

```jsx
import { useAnalytics } from '@realcast/react';

function AnalyticsDashboard({ streamId }) {
  const { analytics, loading } = useAnalytics(streamId);
  
  if (loading) return <div>Loading analytics...</div>;
  
  return (
    <div>
      <h2>Stream Analytics</h2>
      <div>Current Viewers: {analytics.viewers}</div>
      <div>Peak Viewers: {analytics.peakViewers}</div>
      <div>Messages/min: {analytics.messagesPerMinute}</div>
      <div>Avg Watch Time: {analytics.averageWatchTime}s</div>
    </div>
  );
}
```

---

## TypeScript Support

```typescript
import { RealCastProvider, useStream, useChat } from '@realcast/react';
import type { Stream, ChatMessage } from '@realcast/sdk';

function TypedComponent() {
  const { stream }: { stream: Stream | null } = useStream();
  const { messages }: { messages: ChatMessage[] } = useChat(stream?.id);
  
  return (
    <div>
      {stream && <h1>{stream.title}</h1>}
    </div>
  );
}
```

---

## Best Practices

1. **Use RealCastProvider at the root** - Wrap your app for global access
2. **Handle loading states** - Show spinners while data loads
3. **Implement error boundaries** - Catch and display errors gracefully
4. **Optimize re-renders** - Use React.memo for heavy components
5. **Clean up connections** - Chat disconnects automatically on unmount
6. **Secure credentials** - Never expose API keys in client code

---

## Support

- Documentation: https://docs.realcast.io/react
- Examples: https://github.com/realcast/examples/react
- Discord: https://discord.gg/realcast
