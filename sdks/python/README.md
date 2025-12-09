# RealCast Python SDK

Official Python SDK for RealCast PaaS.

## Installation

```bash
pip install realcast
```

## Quick Start

```python
from realcast import RealCastClient

client = RealCastClient(
    api_key='ak_live_your_api_key',
    api_secret='sk_live_your_secret'
)

# Create a stream
stream = client.streams.create(
    app_id='app_xyz789',
    title='My Live Stream',
    quality='high'
)

print(f'Stream created: {stream.stream_key}')
print(f'Playback URL: {stream.playback_url}')
```

## API Reference

### Initialize Client

```python
from realcast import RealCastClient

client = RealCastClient(
    api_key='your_api_key',
    api_secret='your_api_secret',
    base_url='https://api.realcast.io/api'  # Optional
)
```

### Streams

#### Create Stream
```python
stream = client.streams.create(
    app_id='app_id',
    title='Stream Title',
    description='Stream Description',
    quality='high'  # 'low', 'medium', 'high', 'ultra'
)
```

#### Get Stream
```python
stream = client.streams.get('stream_id')
print(f'Status: {stream.status}')
print(f'Viewers: {stream.viewer_count}')
```

#### List Streams
```python
streams = client.streams.list(
    app_id='app_id',
    status='live',  # Optional: 'live', 'offline', 'all'
    limit=50,
    offset=0
)

for stream in streams:
    print(f'{stream.title}: {stream.viewer_count} viewers')
```

#### Delete Stream
```python
client.streams.delete('stream_id')
```

### Analytics

```python
# Get overview
analytics = client.analytics.get_overview(
    app_id='app_id',
    days=7
)

print(f'Total streams: {analytics["streams"]["total"]}')
print(f'Total views: {analytics["viewers"]["total_views"]}')

# Get bandwidth usage
bandwidth = client.analytics.get_bandwidth(
    app_id='app_id',
    days=30
)

print(f'Bandwidth used: {bandwidth["total_bandwidth_gb"]} GB')
```

### Webhooks

```python
# Create webhook
webhook = client.webhooks.create(
    app_id='app_id',
    url='https://yourapp.com/webhooks',
    events=['stream.live', 'stream.offline', 'viewer.joined'],
    enabled=True
)

# Verify webhook signature
from realcast import verify_webhook_signature

is_valid = verify_webhook_signature(
    payload=request.body,
    signature=request.headers['X-RealCast-Signature'],
    secret=webhook['secret']
)
```

### Recordings

```python
# Start recording
recording = client.recordings.start(
    stream_id='stream_id',
    app_id='app_id'
)

# Stop recording
result = client.recordings.stop('stream_id')
print(f'CDN URL: {result["cdn_url"]}')

# List recordings
recordings = client.recordings.list(
    app_id='app_id',
    limit=50
)

for rec in recordings:
    print(f'{rec["title"]}: {rec["duration"]}s')
```

## Flask Integration

### Webhook Handler

```python
from flask import Flask, request, jsonify
from realcast import verify_webhook_signature
import os

app = Flask(__name__)
WEBHOOK_SECRET = os.environ['REALCAST_WEBHOOK_SECRET']

@app.route('/webhooks/realcast', methods=['POST'])
def handle_webhook():
    # Verify signature
    signature = request.headers.get('X-RealCast-Signature')
    payload = request.get_data(as_text=True)
    
    if not verify_webhook_signature(payload, signature, WEBHOOK_SECRET):
        return jsonify({'error': 'Invalid signature'}), 401
    
    # Process event
    data = request.json
    event = data['event']
    
    if event == 'stream.live':
        stream_id = data['data']['stream_id']
        print(f'Stream {stream_id} went live')
        # Send notifications, update database, etc.
    
    elif event == 'stream.offline':
        stream_id = data['data']['stream_id']
        print(f'Stream {stream_id} ended')
        # Archive stream, send email, etc.
    
    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    app.run(port=3000)
```

### Stream Monitoring

```python
import time
from realcast import RealCastClient

client = RealCastClient(
    api_key=os.environ['REALCAST_API_KEY'],
    api_secret=os.environ['REALCAST_API_SECRET']
)

def monitor_streams(app_id):
    """Monitor all streams and log viewer counts"""
    while True:
        streams = client.streams.list(app_id=app_id, status='live')
        
        for stream in streams:
            print(f'{stream.title}: {stream.viewer_count} viewers')
            
            # Alert if viewer count drops
            if stream.viewer_count < 10:
                send_alert(f'Low viewer count for {stream.title}')
        
        time.sleep(30)  # Check every 30 seconds

if __name__ == '__main__':
    monitor_streams('app_xyz789')
```

## Django Integration

### Views

```python
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from realcast import verify_webhook_signature
import json
import os

WEBHOOK_SECRET = os.environ['REALCAST_WEBHOOK_SECRET']

@csrf_exempt
@require_http_methods(["POST"])
def realcast_webhook(request):
    # Verify signature
    signature = request.headers.get('X-RealCast-Signature')
    payload = request.body.decode('utf-8')
    
    if not verify_webhook_signature(payload, signature, WEBHOOK_SECRET):
        return JsonResponse({'error': 'Invalid signature'}, status=401)
    
    # Process event
    data = json.loads(payload)
    event = data['event']
    
    if event == 'stream.live':
        # Handle stream live event
        stream_id = data['data']['stream_id']
        Stream.objects.filter(id=stream_id).update(status='live')
    
    return JsonResponse({'status': 'ok'})
```

### Models

```python
from django.db import models

class Stream(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    app_id = models.CharField(max_length=255)
    title = models.CharField(max_length=255)
    status = models.CharField(max_length=50, default='offline')
    stream_key = models.CharField(max_length=255)
    playback_url = models.URLField()
    viewer_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.title
```

## Async Support

```python
import asyncio
from realcast import AsyncRealCastClient

async def main():
    client = AsyncRealCastClient(
        api_key='your_api_key',
        api_secret='your_secret'
    )
    
    # Create stream asynchronously
    stream = await client.streams.create(
        app_id='app_id',
        title='Async Stream'
    )
    
    print(f'Stream created: {stream.id}')
    
    # Close client
    await client.close()

if __name__ == '__main__':
    asyncio.run(main())
```

## Error Handling

```python
from realcast import RealCastClient, RealCastError, RealCastAPIError

client = RealCastClient(api_key='...', api_secret='...')

try:
    stream = client.streams.create(
        app_id='app_id',
        title='My Stream'
    )
except RealCastAPIError as e:
    print(f'API Error: {e.message}')
    print(f'Status Code: {e.status_code}')
    print(f'Error Code: {e.code}')
except RealCastError as e:
    print(f'SDK Error: {e}')
except Exception as e:
    print(f'Unexpected error: {e}')
```

## Examples

See the [examples directory](./examples) for complete working examples:

- [Basic Streaming](./examples/basic_streaming.py)
- [Flask Webhook Handler](./examples/flask_webhooks.py)
- [Django Integration](./examples/django_app/)
- [Stream Monitor](./examples/stream_monitor.py)
- [Async Operations](./examples/async_example.py)

## Testing

```bash
# Run tests
python -m pytest tests/

# Run with coverage
python -m pytest --cov=realcast tests/
```

## License

MIT
