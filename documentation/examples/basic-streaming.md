# Basic Streaming Example

Simple example showing how to create and manage a stream.

## Prerequisites

- RealCast API key and secret
- OBS Studio or streaming software

## Step-by-Step Implementation

### 1. Setup API Client

```javascript
import { RealCastAPI } from '@realcast/sdk';

const api = new RealCastAPI({
  apiKey: process.env.REALCAST_API_KEY,
  apiSecret: process.env.REALCAST_API_SECRET
});
```

### 2. Authenticate

```javascript
const { accessToken, user } = await api.auth.login({
  email: 'your@email.com',
  password: 'your_password'
});

console.log('Logged in as:', user.email);
```

### 3. Create a Stream

```javascript
const stream = await api.streams.create({
  appId: 'your_app_id',
  title: 'My First Stream',
  description: 'Testing RealCast streaming',
  settings: {
    recording: true,
    transcoding_profile_id: 'default'
  }
}, accessToken);

console.log('Stream created!');
console.log('RTMP URL:', stream.rtmpUrl);
console.log('Stream Key:', stream.streamKey);
console.log('Playback URL:', stream.hlsUrl);
```

### 4. Configure OBS

```
Settings > Stream:
- Service: Custom
- Server: rtmps://ingest.realcast.io/live
- Stream Key: [paste stream.streamKey]
```

### 5. Monitor Stream Status

```javascript
setInterval(async () => {
  const status = await api.streams.getStatus(stream.id, accessToken);
  
  console.log('Status:', status.status);
  console.log('Viewers:', status.viewerCount);
  
  if (status.status === 'live') {
    console.log('Duration:', status.durationSeconds, 'seconds');
  }
}, 5000);
```

### 6. End Stream

```javascript
// When done streaming
await api.streams.update(stream.id, {
  status: 'ended'
}, accessToken);

console.log('Stream ended');
```

## Complete Code

```javascript
const { RealCastAPI } = require('@realcast/sdk');

async function main() {
  // Initialize
  const api = new RealCastAPI({
    apiKey: process.env.REALCAST_API_KEY,
    apiSecret: process.env.REALCAST_API_SECRET
  });
  
  // Login
  const { accessToken } = await api.auth.login({
    email: process.env.EMAIL,
    password: process.env.PASSWORD
  });
  
  // Create stream
  const stream = await api.streams.create({
    appId: process.env.APP_ID,
    title: 'Basic Stream Example',
    description: 'Testing streaming'
  }, accessToken);
  
  console.log('\n=== Stream Created ===');
  console.log('RTMP URL:', stream.rtmpUrl);
  console.log('Stream Key:', stream.streamKey);
  console.log('Watch at:', stream.hlsUrl);
  console.log('\nStart streaming in OBS now!\n');
  
  // Monitor status
  const interval = setInterval(async () => {
    try {
      const status = await api.streams.getStatus(stream.id, accessToken);
      console.log(`[${new Date().toLocaleTimeString()}] Status: ${status.status}, Viewers: ${status.viewerCount}`);
    } catch (error) {
      console.error('Error checking status:', error.message);
    }
  }, 5000);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    clearInterval(interval);
    process.exit(0);
  });
}

main().catch(console.error);
```

## Run the Example

```bash
# Install dependencies
npm install @realcast/sdk dotenv

# Create .env file
echo "REALCAST_API_KEY=your_key" > .env
echo "REALCAST_API_SECRET=your_secret" >> .env
echo "EMAIL=your@email.com" >> .env
echo "PASSWORD=your_password" >> .env
echo "APP_ID=your_app_id" >> .env

# Run
node basic-streaming.js
```

## Expected Output

```
=== Stream Created ===
RTMP URL: rtmps://ingest.realcast.io/live
Stream Key: app_xyz789_stream_abc123_sk_def456...
Watch at: https://cdn.realcast.io/hls/stream_abc123.m3u8

Start streaming in OBS now!

[10:30:15 AM] Status: created, Viewers: 0
[10:30:20 AM] Status: live, Viewers: 0
[10:30:25 AM] Status: live, Viewers: 2
[10:30:30 AM] Status: live, Viewers: 5
```
