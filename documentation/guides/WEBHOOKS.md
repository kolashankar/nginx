# Webhook Integration Guide

## Overview

Webhooks allow your application to receive real-time notifications about events happening in your RealCast streams.

---

## Quick Start

### 1. Configure Webhook Endpoint

Create a webhook endpoint in your application:

```javascript
// Node.js / Express example
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

app.post('/webhooks/realcast', (req, res) => {
  const signature = req.headers['x-realcast-signature'];
  const payload = JSON.stringify(req.body);
  
  // Verify webhook signature
  if (!verifySignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process event
  const { event, data } = req.body;
  
  switch (event) {
    case 'stream.live':
      console.log(`Stream ${data.stream_id} went live`);
      // Notify users, update database, etc.
      break;
      
    case 'stream.offline':
      console.log(`Stream ${data.stream_id} ended`);
      // Archive stream, send email, etc.
      break;
      
    case 'viewer.joined':
      console.log(`New viewer: ${data.viewer_id}`);
      break;
      
    default:
      console.log(`Unhandled event: ${event}`);
  }
  
  // Always respond with 200 to acknowledge receipt
  res.status(200).send('OK');
});

function verifySignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const expectedSignature = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

app.listen(3000);
```

### 2. Register Webhook in RealCast Dashboard

1. Go to your RealCast Dashboard
2. Navigate to **Apps** → Select your app → **Webhooks**
3. Click **Add Webhook**
4. Fill in the details:
   - **URL:** `https://yourdomain.com/webhooks/realcast`
   - **Events:** Select events you want to receive
   - **Enabled:** Check to activate
5. Copy the **Webhook Secret** - you'll need this to verify signatures

---

## Available Events

### Stream Events

#### `stream.live`
Fired when a stream goes live.

```json
{
  "event": "stream.live",
  "timestamp": "2024-12-09T10:00:00Z",
  "data": {
    "stream_id": "stream_abc123",
    "app_id": "app_xyz789",
    "title": "Epic Gaming Session",
    "streamer_id": "user_123",
    "started_at": "2024-12-09T10:00:00Z"
  }
}
```

#### `stream.offline`
Fired when a stream ends.

```json
{
  "event": "stream.offline",
  "timestamp": "2024-12-09T11:00:00Z",
  "data": {
    "stream_id": "stream_abc123",
    "duration": 3600,
    "peak_viewers": 1234,
    "ended_at": "2024-12-09T11:00:00Z"
  }
}
```

#### `stream.error`
Fired when a stream encounters an error.

```json
{
  "event": "stream.error",
  "timestamp": "2024-12-09T10:30:00Z",
  "data": {
    "stream_id": "stream_abc123",
    "error_code": "ENCODER_ERROR",
    "error_message": "Encoder disconnected unexpectedly"
  }
}
```

### Viewer Events

#### `viewer.joined`
Fired when a viewer joins a stream.

```json
{
  "event": "viewer.joined",
  "timestamp": "2024-12-09T10:05:00Z",
  "data": {
    "stream_id": "stream_abc123",
    "viewer_id": "viewer_def456",
    "viewer_count": 125
  }
}
```

#### `viewer.count.update`
Fired every 30 seconds with current viewer count.

```json
{
  "event": "viewer.count.update",
  "timestamp": "2024-12-09T10:05:30Z",
  "data": {
    "stream_id": "stream_abc123",
    "viewer_count": 128,
    "change": 3
  }
}
```

### Recording Events

#### `recording.started`
Fired when recording starts.

```json
{
  "event": "recording.started",
  "timestamp": "2024-12-09T10:00:00Z",
  "data": {
    "recording_id": "rec_ghi789",
    "stream_id": "stream_abc123"
  }
}
```

#### `recording.ready`
Fired when recording is processed and ready for playback.

```json
{
  "event": "recording.ready",
  "timestamp": "2024-12-09T11:15:00Z",
  "data": {
    "recording_id": "rec_ghi789",
    "stream_id": "stream_abc123",
    "cdn_url": "https://cdn.telegram.org/file/BAACAgIAAxkBAAI...",
    "duration": 3600,
    "file_size": 524288000
  }
}
```

### Chat Events

#### `chat.message.new`
Fired when a new chat message is sent.

```json
{
  "event": "chat.message.new",
  "timestamp": "2024-12-09T10:10:00Z",
  "data": {
    "stream_id": "stream_abc123",
    "message_id": "msg_jkl012",
    "user_id": "user_456",
    "user_name": "GamerPro",
    "message": "Great stream!",
    "created_at": "2024-12-09T10:10:00Z"
  }
}
```

---

## Security

### Signature Verification

All webhooks include an `X-RealCast-Signature` header containing an HMAC SHA256 signature.

**Python Example:**
```python
import hmac
import hashlib

def verify_webhook_signature(payload, signature, secret):
    expected_signature = 'sha256=' + hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)

# Usage
payload = request.get_data(as_text=True)
signature = request.headers.get('X-RealCast-Signature')

if verify_webhook_signature(payload, signature, WEBHOOK_SECRET):
    # Process webhook
    pass
else:
    return 'Invalid signature', 401
```

**PHP Example:**
```php
<?php
function verifyWebhookSignature($payload, $signature, $secret) {
    $expectedSignature = 'sha256=' . hash_hmac('sha256', $payload, $secret);
    return hash_equals($signature, $expectedSignature);
}

$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_REALCAST_SIGNATURE'];

if (verifyWebhookSignature($payload, $signature, WEBHOOK_SECRET)) {
    // Process webhook
    $data = json_decode($payload, true);
} else {
    http_response_code(401);
    die('Invalid signature');
}
?>
```

---

## Best Practices

### 1. Respond Quickly

- Return a 200 response immediately
- Process webhook asynchronously using a queue
- Don't perform long operations in the webhook handler

```javascript
app.post('/webhooks/realcast', async (req, res) => {
  // Verify signature first
  if (!verifySignature(...)) {
    return res.status(401).send('Invalid');
  }
  
  // Acknowledge immediately
  res.status(200).send('OK');
  
  // Process asynchronously
  processWebhookAsync(req.body);
});

async function processWebhookAsync(data) {
  // Long-running operations here
  await updateDatabase(data);
  await sendNotifications(data);
}
```

### 2. Implement Idempotency

- Store webhook IDs to prevent duplicate processing
- Use database unique constraints or cache

```javascript
const processedWebhooks = new Set();

app.post('/webhooks/realcast', (req, res) => {
  const webhookId = req.headers['x-realcast-webhook-id'];
  
  if (processedWebhooks.has(webhookId)) {
    console.log('Duplicate webhook, skipping');
    return res.status(200).send('OK');
  }
  
  processedWebhooks.add(webhookId);
  
  // Process webhook
  // ...
  
  res.status(200).send('OK');
});
```

### 3. Handle Retries

- RealCast will retry failed webhooks up to 3 times
- Use exponential backoff: 1s, 5s, 25s
- Return 2xx for successful processing
- Return 4xx for invalid webhooks (won't retry)
- Return 5xx for temporary errors (will retry)

### 4. Monitor Webhook Health

```javascript
const webhookStats = {
  received: 0,
  processed: 0,
  failed: 0
};

app.post('/webhooks/realcast', async (req, res) => {
  webhookStats.received++;
  
  try {
    // Process webhook
    await processWebhook(req.body);
    webhookStats.processed++;
    res.status(200).send('OK');
  } catch (error) {
    webhookStats.failed++;
    console.error('Webhook processing failed:', error);
    res.status(500).send('Error');
  }
});

app.get('/webhooks/stats', (req, res) => {
  res.json(webhookStats);
});
```

---

## Testing

### Test Webhook Endpoint

Use RealCast Dashboard to send test webhooks:

1. Go to **Webhooks** section
2. Select your webhook
3. Click **Send Test Event**
4. Choose event type
5. Check your server logs

### Local Testing with ngrok

```bash
# Install ngrok
npm install -g ngrok

# Start your local server
node server.js

# Expose it to the internet
ngrok http 3000

# Use the ngrok URL in your webhook configuration
# https://abc123.ngrok.io/webhooks/realcast
```

---

## Troubleshooting

### Webhook Not Receiving Events

**Check:**
1. Webhook URL is publicly accessible
2. Webhook is enabled in dashboard
3. Events are selected in webhook configuration
4. Firewall allows incoming connections
5. SSL certificate is valid (for HTTPS)

### Signature Verification Failing

**Check:**
1. Using correct webhook secret
2. Computing signature on raw request body
3. Including 'sha256=' prefix in comparison
4. Using timing-safe comparison function

### High Latency

**Solutions:**
1. Return 200 response immediately
2. Process webhooks asynchronously
3. Use message queue (Redis, RabbitMQ)
4. Optimize database queries
5. Cache frequently accessed data

---

## Example Use Cases

### Send Email When Stream Ends

```javascript
app.post('/webhooks/realcast', async (req, res) => {
  const { event, data } = req.body;
  
  if (event === 'stream.offline') {
    await sendEmail({
      to: 'streamer@example.com',
      subject: 'Your stream has ended',
      body: `
        Your stream ended after ${data.duration / 60} minutes
        with ${data.peak_viewers} peak viewers.
        
        View analytics: https://dashboard.realcast.io/streams/${data.stream_id}
      `
    });
  }
  
  res.status(200).send('OK');
});
```

### Post to Discord When Stream Goes Live

```javascript
const axios = require('axios');

app.post('/webhooks/realcast', async (req, res) => {
  const { event, data } = req.body;
  
  if (event === 'stream.live') {
    await axios.post(process.env.DISCORD_WEBHOOK_URL, {
      content: `@everyone ${data.title} is now live! Watch at: https://watch.example.com/${data.stream_id}`
    });
  }
  
  res.status(200).send('OK');
});
```

### Update Database

```javascript
app.post('/webhooks/realcast', async (req, res) => {
  const { event, data } = req.body;
  
  switch (event) {
    case 'stream.live':
      await db.streams.update({
        id: data.stream_id,
        status: 'live',
        started_at: data.started_at
      });
      break;
      
    case 'viewer.count.update':
      await db.streams.update({
        id: data.stream_id,
        viewer_count: data.viewer_count
      });
      break;
  }
  
  res.status(200).send('OK');
});
```

---

## Next Steps

- [View API Documentation](../API.md)
- [Setup React Integration](./REACT_INTEGRATION.md)
- [Configure OBS](./OBS_SETUP.md)

---

## Support

Need help?
- Email: support@realcast.io
- Docs: https://docs.realcast.io
