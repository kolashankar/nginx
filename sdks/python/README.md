# RealCast Python SDK

Official Python SDK for RealCast PaaS.

## Installation

```bash
pip install realcast-sdk
```

## Quick Start

```python
from realcast import RealCastAPI, RealCastChat

# Initialize API client
api = RealCastAPI(
    api_key='your_api_key',
    api_secret='your_api_secret'
)

# Create a stream
stream = api.streams.create(
    app_id='app_xyz789',
    title='My Live Stream',
    description='Gaming session'
)

print(f'Stream Key: {stream["stream_key"]}')
print(f'HLS URL: {stream["hls_url"]}')

# Initialize chat
chat = RealCastChat(
    stream_id=stream['id'],
    user_id='user_123',
    username='GamerPro',
    token='jwt_token'
)

# Listen for messages
@chat.on('message')
def handle_message(data):
    print(f"{data['username']}: {data['message']}")

# Send message
chat.send_message('Hello everyone!')

# Start chat client
chat.connect()
```

## API Reference

### RealCastAPI

#### Constructor

```python
api = RealCastAPI(
    api_key='your_api_key',
    api_secret='your_api_secret',
    base_url='https://api.realcast.io/api'  # optional
)
```

#### Authentication

```python
# Register
user = api.auth.register(
    email='user@example.com',
    password='SecurePass123!',
    full_name='John Doe'
)

# Login
response = api.auth.login(
    email='user@example.com',
    password='SecurePass123!'
)
access_token = response['access_token']
user = response['user']

# Get current user
user = api.auth.get_current_user(access_token)
```

#### Apps

```python
# Create app
app = api.apps.create(
    name='My App',
    description='Live streaming app',
    settings={
        'recording_enabled': True,
        'chat_enabled': True
    },
    token=access_token
)

# List apps
apps = api.apps.list(token=access_token)

# Get app
app = api.apps.get(app_id, token=access_token)

# Update app
app = api.apps.update(
    app_id,
    name='Updated Name',
    token=access_token
)

# Delete app
api.apps.delete(app_id, token=access_token)
```

#### Streams

```python
# Create stream
stream = api.streams.create(
    app_id='app_xyz789',
    title='My Stream',
    description='Stream description',
    settings={'recording': True},
    token=access_token
)

# List streams
streams = api.streams.list(
    app_id='app_xyz789',
    limit=50,
    skip=0,
    token=access_token
)

# Get stream
stream = api.streams.get(stream_id, token=access_token)

# Get stream status
status = api.streams.get_status(stream_id, token=access_token)
# Returns: {'status': 'live', 'viewer_count': 123, 'started_at': '...'}

# Generate playback token
token_data = api.streams.generate_playback_token(
    stream_id,
    viewer_id='viewer_123',
    expiry_minutes=60,
    token=access_token
)

# Update stream
stream = api.streams.update(
    stream_id,
    title='Updated Title',
    token=access_token
)

# Delete stream
api.streams.delete(stream_id, token=access_token)
```

#### API Keys

```python
# Create API key
key = api.api_keys.create(
    app_id='app_xyz789',
    name='Production Key',
    scopes=['streams:read', 'streams:write'],
    token=access_token
)

# List API keys
keys = api.api_keys.list(
    app_id='app_xyz789',
    token=access_token
)

# Regenerate secret
key = api.api_keys.regenerate(key_id, token=access_token)

# Delete API key
api.api_keys.delete(key_id, token=access_token)
```

#### Webhooks

```python
# Create webhook
webhook = api.webhooks.create(
    app_id='app_xyz789',
    url='https://your-app.com/webhooks',
    events=['stream.live', 'stream.offline'],
    secret='webhook_secret',
    token=access_token
)

# List webhooks
webhooks = api.webhooks.list(
    app_id='app_xyz789',
    token=access_token
)

# Update webhook
webhook = api.webhooks.update(
    webhook_id,
    events=['stream.live', 'stream.offline', 'chat.message.new'],
    token=access_token
)

# Delete webhook
api.webhooks.delete(webhook_id, token=access_token)
```

#### Recordings

```python
# Start recording
recording = api.recordings.start(
    stream_id='stream_123',
    app_id='app_xyz789',
    stream_url='rtmp://...',
    title='Recording Title',
    token=access_token
)

# Stop recording
recording = api.recordings.stop(stream_id, token=access_token)

# List recordings
recordings = api.recordings.list(
    app_id='app_xyz789',
    limit=50,
    token=access_token
)

# Get recording
recording = api.recordings.get(recording_id, token=access_token)

# Delete recording
api.recordings.delete(recording_id, token=access_token)
```

### RealCastChat

#### Constructor

```python
chat = RealCastChat(
    stream_id='stream_123',
    user_id='user_123',
    username='GamerPro',
    token='jwt_token',
    server_url='wss://realtime.realcast.io'  # optional
)
```

#### Methods

```python
# Connect to chat
chat.connect()

# Send message
chat.send_message('Hello everyone!')

# Send reaction
chat.send_reaction('👍')

# Disconnect
chat.disconnect()
```

#### Event Handlers

```python
# Using decorator
@chat.on('message')
def handle_message(data):
    print(f"{data['username']}: {data['message']}")

@chat.on('viewer:count')
def handle_viewer_count(data):
    print(f"Viewers: {data['count']}")

# Using method
chat.on('stream:live', lambda data: print('Stream started!'))
```

## Examples

### Complete Integration Example

```python
from realcast import RealCastAPI, RealCastChat
import time

class LiveStreamApp:
    def __init__(self, api_key, api_secret):
        self.api = RealCastAPI(api_key=api_key, api_secret=api_secret)
        self.chat = None
        self.access_token = None
        self.user = None
    
    def initialize(self, email, password):
        """Login and initialize"""
        response = self.api.auth.login(email=email, password=password)
        self.access_token = response['access_token']
        self.user = response['user']
        print(f'Logged in as: {self.user["email"]}')
    
    def create_stream(self, app_id, title):
        """Create a new stream"""
        stream = self.api.streams.create(
            app_id=app_id,
            title=title,
            description='Created via Python SDK',
            token=self.access_token
        )
        
        print('Stream created!')
        print(f'Stream Key: {stream["stream_key"]}')
        print(f'HLS URL: {stream["hls_url"]}')
        
        return stream
    
    def initialize_chat(self, stream_id, username):
        """Initialize chat connection"""
        self.chat = RealCastChat(
            stream_id=stream_id,
            user_id=self.user['id'],
            username=username,
            token=self.access_token
        )
        
        @self.chat.on('connect')
        def on_connect():
            print('Chat connected!')
        
        @self.chat.on('message')
        def on_message(data):
            print(f"{data['username']}: {data['message']}")
        
        @self.chat.on('viewer:count')
        def on_viewer_count(data):
            print(f'Viewers: {data["count"]}')
        
        self.chat.connect()
    
    def send_chat_message(self, message):
        """Send a chat message"""
        if self.chat:
            self.chat.send_message(message)

# Usage
app = LiveStreamApp('your_api_key', 'your_api_secret')

app.initialize('user@example.com', 'password')
stream = app.create_stream('app_xyz789', 'My Python Stream')
app.initialize_chat(stream['id'], 'PythonDev')
app.send_chat_message('Hello from Python!')

# Keep alive
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    app.chat.disconnect()
    print('Disconnected')
```

### Async/Await Support

```python
import asyncio
from realcast import AsyncRealCastAPI

async def main():
    api = AsyncRealCastAPI(api_key='key', api_secret='secret')
    
    # All methods are async
    stream = await api.streams.create(
        app_id='app_xyz789',
        title='Async Stream',
        token=token
    )
    
    print(f'Stream created: {stream["id"]}')

# Run
asyncio.run(main())
```

### Error Handling

```python
from realcast import RealCastAPI, RealCastError

try:
    stream = api.streams.create(...)
except RealCastError as e:
    if e.status_code == 401:
        print('Unauthorized - check your token')
    elif e.status_code == 429:
        print(f'Rate limited - retry after: {e.retry_after}')
    else:
        print(f'Error: {e.message}')
```

## Type Hints

The SDK includes full type hints for better IDE support:

```python
from realcast import RealCastAPI
from realcast.types import Stream, App, Recording

def create_and_record_stream(
    api: RealCastAPI,
    app_id: str,
    title: str,
    token: str
) -> tuple[Stream, Recording]:
    stream: Stream = api.streams.create(
        app_id=app_id,
        title=title,
        token=token
    )
    
    recording: Recording = api.recordings.start(
        stream_id=stream['id'],
        app_id=app_id,
        token=token
    )
    
    return stream, recording
```

## Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md).

## License

MIT
