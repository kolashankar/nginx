# RealCast JavaScript SDK

Official JavaScript/TypeScript SDK for RealCast PaaS.

## Installation

```bash
npm install @realcast/sdk
```

Or with yarn:
```bash
yarn add @realcast/sdk
```

## Quick Start

```javascript
import { RealCastClient } from '@realcast/sdk';

const client = new RealCastClient({
  apiKey: 'ak_live_your_api_key',
  apiSecret: 'sk_live_your_secret'
});

// Create a stream
const stream = await client.streams.create({
  appId: 'app_xyz789',
  title: 'My Live Stream',
  quality: 'high'
});

console.log('Stream created:', stream.streamKey);
console.log('Playback URL:', stream.playbackUrl);
```

## API Reference

### Initialize Client

```javascript
const client = new RealCastClient({
  apiKey: 'your_api_key',
  apiSecret: 'your_api_secret',
  baseUrl: 'https://api.realcast.io/api'  // Optional
});
```

### Streams

#### Create Stream
```javascript
const stream = await client.streams.create({
  appId: 'app_id',
  title: 'Stream Title',
  description: 'Stream Description',
  quality: 'high'  // 'low', 'medium', 'high', 'ultra'
});
```

#### Get Stream
```javascript
const stream = await client.streams.get('stream_id');
console.log('Status:', stream.status);
console.log('Viewers:', stream.viewerCount);
```

#### List Streams
```javascript
const streams = await client.streams.list({
  appId: 'app_id',
  status: 'live',  // Optional: 'live', 'offline', 'all'
  limit: 50,
  offset: 0
});
```

#### Delete Stream
```javascript
await client.streams.delete('stream_id');
```

### Real-Time Chat

```javascript
import { RealTimeClient } from '@realcast/sdk';

const rtClient = new RealTimeClient({
  url: 'https://realtime.realcast.io',
  auth: {
    userId: 'user_123',
    userName: 'John Doe'
  }
});

// Connect
await rtClient.connect();

// Join channel
await rtClient.joinChannel('stream_abc123');

// Listen for messages
rtClient.on('message', (data) => {
  console.log(`${data.userName}: ${data.message}`);
});

// Send message
await rtClient.sendMessage({
  channelId: 'stream_abc123',
  message: 'Hello everyone!'
});

// Leave channel
await rtClient.leaveChannel('stream_abc123');

// Disconnect
await rtClient.disconnect();
```

### Analytics

```javascript
// Get overview
const analytics = await client.analytics.getOverview({
  appId: 'app_id',
  days: 7
});

console.log('Total streams:', analytics.streams.total);
console.log('Total views:', analytics.viewers.totalViews);

// Get bandwidth usage
const bandwidth = await client.analytics.getBandwidth({
  appId: 'app_id',
  days: 30
});

console.log('Bandwidth used:', bandwidth.totalBandwidthGb, 'GB');
```

### Webhooks

```javascript
// Create webhook
const webhook = await client.webhooks.create({
  appId: 'app_id',
  url: 'https://yourapp.com/webhooks',
  events: ['stream.live', 'stream.offline', 'viewer.joined'],
  enabled: true
});

// Verify webhook signature
import { verifyWebhookSignature } from '@realcast/sdk';

const isValid = verifyWebhookSignature(
  payload,
  signature,
  webhook.secret
);
```

### Recordings

```javascript
// Start recording
const recording = await client.recordings.start({
  streamId: 'stream_id',
  appId: 'app_id'
});

// Stop recording
const result = await client.recordings.stop('stream_id');
console.log('CDN URL:', result.cdnUrl);

// List recordings
const recordings = await client.recordings.list({
  appId: 'app_id',
  limit: 50
});
```

## React Hooks

### useStream

```javascript
import { useStream } from '@realcast/react';

function StreamComponent({ streamId }) {
  const { stream, loading, error } = useStream(streamId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{stream.title}</h1>
      <p>Status: {stream.status}</p>
      <p>Viewers: {stream.viewerCount}</p>
    </div>
  );
}
```

### useChat

```javascript
import { useChat } from '@realcast/react';

function ChatComponent({ streamId, userId, userName }) {
  const { messages, sendMessage, isConnected } = useChat({
    streamId,
    userId,
    userName
  });

  return (
    <div>
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id}>
            <strong>{msg.userName}:</strong> {msg.message}
          </div>
        ))}
      </div>
      <input 
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            sendMessage(e.target.value);
            e.target.value = '';
          }
        }}
        disabled={!isConnected}
      />
    </div>
  );
}
```

## TypeScript Support

The SDK is written in TypeScript and includes type definitions.

```typescript
import { RealCastClient, Stream, StreamCreateOptions } from '@realcast/sdk';

const client = new RealCastClient({
  apiKey: process.env.REALCAST_API_KEY!,
  apiSecret: process.env.REALCAST_API_SECRET!
});

const options: StreamCreateOptions = {
  appId: 'app_123',
  title: 'My Stream',
  quality: 'high'
};

const stream: Stream = await client.streams.create(options);
```

## Error Handling

```javascript
try {
  const stream = await client.streams.create(options);
} catch (error) {
  if (error instanceof RealCastError) {
    console.error('API Error:', error.message);
    console.error('Status Code:', error.statusCode);
    console.error('Error Code:', error.code);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Examples

See the [examples directory](./examples) for complete working examples:

- [Basic Streaming](./examples/basic-streaming.js)
- [React App](./examples/react-app)
- [Next.js Integration](./examples/nextjs-app)
- [Live Chat](./examples/live-chat.js)
- [Webhook Handler](./examples/webhook-handler.js)

## License

MIT
