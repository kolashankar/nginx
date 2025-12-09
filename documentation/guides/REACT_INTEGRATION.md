# React App Integration Guide

## Overview

This guide shows you how to integrate RealCast streaming into your React application.

---

## Installation

### Install Dependencies

```bash
npm install hls.js socket.io-client axios
```

Or with yarn:
```bash
yarn add hls.js socket.io-client axios
```

---

## Quick Start

### 1. Initialize RealCast Client

Create a configuration file:

**`src/config/realcast.js`**
```javascript
export const REALCAST_CONFIG = {
  apiKey: 'ak_live_your_api_key_here',
  apiSecret: 'sk_live_your_api_secret_here',
  apiUrl: 'https://api.realcast.io/api',
  realtimeUrl: 'https://realtime.realcast.io'
};
```

### 2. Create Video Player Component

**`src/components/VideoPlayer.jsx`**
```javascript
import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

const VideoPlayer = ({ streamUrl, autoPlay = true }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const video = videoRef.current;

    if (Hls.isSupported()) {
      // HLS.js is supported
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLive(true);
        if (autoPlay) {
          video.play().catch(e => {
            console.error('Autoplay failed:', e);
          });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError('Network error - retrying...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError('Media error - recovering...');
              hls.recoverMediaError();
              break;
            default:
              setError('Fatal error - cannot recover');
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLive(true);
        if (autoPlay) {
          video.play();
        }
      });
    } else {
      setError('HLS not supported in this browser');
    }
  }, [streamUrl, autoPlay]);

  return (
    <div className="video-player">
      <video
        ref={videoRef}
        controls
        style={{ width: '100%', height: 'auto', backgroundColor: '#000' }}
      />
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      {isLive && (
        <div className="live-badge">
          🔴 LIVE
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
```

### 3. Create Chat Component

**`src/components/ChatWidget.jsx`**
```javascript
import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { REALCAST_CONFIG } from '../config/realcast';

const ChatWidget = ({ streamId, userId, userName }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Connect to Socket.IO server
    const socket = io(REALCAST_CONFIG.realtimeUrl, {
      auth: {
        userId,
        userName
      }
    });

    socket.on('connect', () => {
      setIsConnected(true);
      // Join stream chat room
      socket.emit('join_channel', { channel_id: streamId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Listen for chat messages
    socket.on('chat_message', (data) => {
      setMessages(prev => [...prev, data]);
    });

    // Listen for system messages
    socket.on('system_message', (data) => {
      setMessages(prev => [...prev, { ...data, isSystem: true }]);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [streamId, userId, userName]);

  useEffect(() => {
    // Auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !isConnected) return;

    socketRef.current.emit('send_message', {
      channel_id: streamId,
      message: inputMessage,
      user_id: userId,
      user_name: userName
    });

    setInputMessage('');
  };

  return (
    <div className="chat-widget" style={{ 
      height: '500px',
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid #ddd'
    }}>
      <div className="chat-header" style={{ 
        padding: '10px',
        borderBottom: '1px solid #ddd',
        backgroundColor: '#f5f5f5'
      }}>
        <h3>Live Chat</h3>
        <span style={{ color: isConnected ? 'green' : 'red' }}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </span>
      </div>

      <div className="messages" style={{ 
        flex: 1,
        overflowY: 'auto',
        padding: '10px'
      }}>
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={msg.isSystem ? 'system-message' : 'user-message'}
            style={{ marginBottom: '10px' }}
          >
            {msg.isSystem ? (
              <span style={{ color: '#666', fontStyle: 'italic' }}>
                {msg.message}
              </span>
            ) : (
              <>
                <strong>{msg.user_name}:</strong> {msg.message}
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} style={{ 
        padding: '10px',
        borderTop: '1px solid #ddd'
      }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={!isConnected}
            style={{ flex: 1, padding: '8px' }}
          />
          <button 
            type="submit"
            disabled={!isConnected || !inputMessage.trim()}
            style={{ padding: '8px 16px' }}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWidget;
```

### 4. Create Stream Page

**`src/pages/StreamPage.jsx`**
```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import VideoPlayer from '../components/VideoPlayer';
import ChatWidget from '../components/ChatWidget';
import { REALCAST_CONFIG } from '../config/realcast';

const StreamPage = ({ streamId }) => {
  const [streamData, setStreamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    // Fetch stream data
    const fetchStream = async () => {
      try {
        const response = await axios.get(
          `${REALCAST_CONFIG.apiUrl}/streams/${streamId}`,
          {
            headers: {
              'Authorization': `Bearer ${REALCAST_CONFIG.apiKey}`
            }
          }
        );
        setStreamData(response.data);
      } catch (error) {
        console.error('Error fetching stream:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStream();

    // Poll viewer count every 10 seconds
    const interval = setInterval(fetchStream, 10000);
    return () => clearInterval(interval);
  }, [streamId]);

  if (loading) {
    return <div>Loading stream...</div>;
  }

  if (!streamData) {
    return <div>Stream not found</div>;
  }

  return (
    <div className="stream-page" style={{ 
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: '20px',
      padding: '20px'
    }}>
      <div className="video-section">
        <VideoPlayer streamUrl={streamData.playback_url} />
        
        <div className="stream-info" style={{ marginTop: '20px' }}>
          <h2>{streamData.title}</h2>
          <p>{streamData.description}</p>
          <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
            <span>👥 {streamData.viewer_count || 0} viewers</span>
            <span>⏱️ {formatDuration(streamData.duration || 0)}</span>
          </div>
        </div>
      </div>

      <div className="chat-section">
        <ChatWidget 
          streamId={streamId}
          userId="user_123"
          userName="Anonymous User"
        />
      </div>
    </div>
  );
};

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export default StreamPage;
```

---

## Advanced Features

### Quality Selector

```javascript
const QualitySelector = ({ hls }) => {
  const [qualities, setQualities] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(-1);

  useEffect(() => {
    if (hls) {
      setQualities(hls.levels);
      setCurrentLevel(hls.currentLevel);

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        setCurrentLevel(data.level);
      });
    }
  }, [hls]);

  const changeQuality = (level) => {
    hls.currentLevel = level;
  };

  return (
    <select 
      value={currentLevel} 
      onChange={(e) => changeQuality(parseInt(e.target.value))}
    >
      <option value={-1}>Auto</option>
      {qualities.map((level, index) => (
        <option key={index} value={index}>
          {level.height}p - {Math.round(level.bitrate / 1000)}kbps
        </option>
      ))}
    </select>
  );
};
```

### Viewer Analytics

```javascript
import { useEffect } from 'react';

const useStreamAnalytics = (streamId) => {
  useEffect(() => {
    // Track viewer session
    const sessionStart = Date.now();

    // Send analytics on page load
    axios.post(`${REALCAST_CONFIG.apiUrl}/analytics/view`, {
      stream_id: streamId,
      event: 'view_start',
      timestamp: new Date().toISOString()
    });

    // Send analytics on page unload
    return () => {
      const watchTime = Math.floor((Date.now() - sessionStart) / 1000);
      axios.post(`${REALCAST_CONFIG.apiUrl}/analytics/view`, {
        stream_id: streamId,
        event: 'view_end',
        watch_time: watchTime,
        timestamp: new Date().toISOString()
      });
    };
  }, [streamId]);
};
```

---

## Next Steps

- [Configure Webhooks](./WEBHOOKS.md)
- [Setup OBS Streaming](./OBS_SETUP.md)
- [View API Documentation](../API.md)

---

## Support

Need help?
- Email: support@realcast.io
- Docs: https://docs.realcast.io
