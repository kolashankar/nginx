# RealCast JavaScript/TypeScript SDK

Official JavaScript/TypeScript SDK for RealCast PaaS.

## Installation

```bash
npm install @realcast/sdk
# or
yarn add @realcast/sdk
```

## Quick Start

```typescript
import { RealCastAPI, RealCastChat } from '@realcast/sdk';

// Initialize API client
const api = new RealCastAPI({
  apiKey: 'your_api_key',
  apiSecret: 'your_api_secret'
});

// Create a stream
const stream = await api.streams.create({
  appId: 'app_xyz789',
  title: 'My Live Stream',
  description: 'Gaming session'
});

console.log('Stream Key:', stream.streamKey);
console.log('HLS URL:', stream.hlsUrl);

// Initialize chat
const chat = new RealCastChat({
  streamId: stream.id,
  userId: 'user_123',
  username: 'GamerPro',
  token: 'jwt_token'
});

// Listen for messages
chat.on('message', (data) => {
  console.log(`${data.username}: ${data.message}`);
});

// Send message
chat.sendMessage('Hello everyone!');
```

## API Reference

### RealCastAPI

#### Constructor

```typescript
const api = new RealCastAPI({
  apiKey: string,
  apiSecret: string,
  baseUrl?: string  // default: https://api.realcast.io/api
});
```

#### Authentication

```typescript
// Register
const user = await api.auth.register({
  email: 'user@example.com',
  password: 'SecurePass123!',
  fullName: 'John Doe'
});

// Login
const { accessToken, user } = await api.auth.login({
  email: 'user@example.com',
  password: 'SecurePass123!'
});

// Get current user
const user = await api.auth.getCurrentUser(accessToken);
```

#### Apps

```typescript
// Create app
const app = await api.apps.create({
  name: 'My App',
  description: 'Live streaming app',
  settings: {
    recordingEnabled: true,
    chatEnabled: true
  }
}, accessToken);

// List apps
const apps = await api.apps.list(accessToken);

// Get app
const app = await api.apps.get(appId, accessToken);

// Update app
const app = await api.apps.update(appId, {
  name: 'Updated Name'
}, accessToken);

// Delete app
await api.apps.delete(appId, accessToken);
```

#### Streams

```typescript
// Create stream
const stream = await api.streams.create({
  appId: 'app_xyz789',
  title: 'My Stream',
  description: 'Stream description',
  settings: {
    recording: true
  }
}, accessToken);

// List streams
const streams = await api.streams.list({
  appId: 'app_xyz789',
  limit: 50,
  skip: 0
}, accessToken);

// Get stream
const stream = await api.streams.get(streamId, accessToken);

// Get stream status
const status = await api.streams.getStatus(streamId, accessToken);
// Returns: { status: 'live', viewerCount: 123, startedAt: '...' }

// Generate playback token
const token = await api.streams.generatePlaybackToken(streamId, {
  viewerId: 'viewer_123',
  expiryMinutes: 60
}, accessToken);

// Update stream
const stream = await api.streams.update(streamId, {
  title: 'Updated Title'
}, accessToken);

// Delete stream
await api.streams.delete(streamId, accessToken);
```

#### API Keys

```typescript
// Create API key
const key = await api.apiKeys.create({
  appId: 'app_xyz789',
  name: 'Production Key',
  scopes: ['streams:read', 'streams:write']
}, accessToken);

// List API keys
const keys = await api.apiKeys.list({
  appId: 'app_xyz789'
}, accessToken);

// Regenerate secret
const key = await api.apiKeys.regenerate(keyId, accessToken);

// Delete API key
await api.apiKeys.delete(keyId, accessToken);
```

#### Webhooks

```typescript
// Create webhook
const webhook = await api.webhooks.create({
  appId: 'app_xyz789',
  url: 'https://your-app.com/webhooks',
  events: ['stream.live', 'stream.offline'],
  secret: 'webhook_secret'
}, accessToken);

// List webhooks
const webhooks = await api.webhooks.list({
  appId: 'app_xyz789'
}, accessToken);

// Update webhook
const webhook = await api.webhooks.update(webhookId, {
  events: ['stream.live', 'stream.offline', 'chat.message.new']
}, accessToken);

// Delete webhook
await api.webhooks.delete(webhookId, accessToken);
```

#### Recordings

```typescript
// Start recording
const recording = await api.recordings.start({
  streamId: 'stream_123',
  appId: 'app_xyz789',
  streamUrl: 'rtmp://...',
  title: 'Recording Title'
}, accessToken);

// Stop recording
const recording = await api.recordings.stop(streamId, accessToken);

// List recordings
const recordings = await api.recordings.list({
  appId: 'app_xyz789',
  limit: 50
}, accessToken);

// Get recording
const recording = await api.recordings.get(recordingId, accessToken);

// Delete recording
await api.recordings.delete(recordingId, accessToken);
```

### RealCastChat

#### Constructor

```typescript
const chat = new RealCastChat({
  streamId: string,
  userId: string,
  username: string,
  token: string,
  serverUrl?: string  // default: wss://realtime.realcast.io
});
```

#### Methods

```typescript
// Send message
chat.sendMessage(message: string): void

// Send reaction
chat.sendReaction(emoji: string): void

// Disconnect
chat.disconnect(): void
```

#### Events

```typescript
// Chat events
chat.on('connect', () => { ... });
chat.on('disconnect', () => { ... });
chat.on('message', (data) => { ... });
chat.on('typing', (data) => { ... });
chat.on('reaction', (data) => { ... });

// Stream events
chat.on('stream:live', (data) => { ... });
chat.on('stream:offline', (data) => { ... });
chat.on('viewer:count', (data) => { ... });

// Moderation events
chat.on('user:banned', (data) => { ... });
chat.on('user:muted', (data) => { ... });
chat.on('message:deleted', (data) => { ... });
```

## Examples

### Complete Integration Example

```typescript
import { RealCastAPI, RealCastChat } from '@realcast/sdk';

class LiveStreamApp {
  private api: RealCastAPI;
  private chat: RealCastChat | null = null;
  
  constructor(apiKey: string, apiSecret: string) {
    this.api = new RealCastAPI({ apiKey, apiSecret });
  }
  
  async initialize(userEmail: string, password: string) {
    // Login
    const { accessToken, user } = await this.api.auth.login({
      email: userEmail,
      password: password
    });
    
    this.accessToken = accessToken;
    this.user = user;
    
    console.log('Logged in as:', user.email);
  }
  
  async createStream(appId: string, title: string) {
    const stream = await this.api.streams.create({
      appId,
      title,
      description: 'Created via SDK'
    }, this.accessToken);
    
    console.log('Stream created!');
    console.log('Stream Key:', stream.streamKey);
    console.log('HLS URL:', stream.hlsUrl);
    
    return stream;
  }
  
  initializeChat(streamId: string, username: string) {
    this.chat = new RealCastChat({
      streamId,
      userId: this.user.id,
      username,
      token: this.accessToken
    });
    
    this.chat.on('connect', () => {
      console.log('Chat connected!');
    });
    
    this.chat.on('message', (data) => {
      console.log(`${data.username}: ${data.message}`);
    });
    
    this.chat.on('viewer:count', (data) => {
      console.log('Viewers:', data.count);
    });
  }
  
  sendChatMessage(message: string) {
    if (this.chat) {
      this.chat.sendMessage(message);
    }
  }
}

// Usage
const app = new LiveStreamApp('your_api_key', 'your_api_secret');

await app.initialize('user@example.com', 'password');
const stream = await app.createStream('app_xyz789', 'My Live Stream');
app.initializeChat(stream.id, 'GamerPro');
app.sendChatMessage('Hello everyone!');
```

### Error Handling

```typescript
try {
  const stream = await api.streams.create(data, token);
} catch (error) {
  if (error.status === 401) {
    console.error('Unauthorized - check your token');
  } else if (error.status === 429) {
    console.error('Rate limited - retry after:', error.retryAfter);
  } else {
    console.error('Error:', error.message);
  }
}
```

## TypeScript Support

The SDK is written in TypeScript with full type definitions:

```typescript
import type {
  Stream,
  StreamCreate,
  StreamStatus,
  App,
  ApiKey,
  Webhook,
  Recording
} from '@realcast/sdk';
```

## License

MIT
