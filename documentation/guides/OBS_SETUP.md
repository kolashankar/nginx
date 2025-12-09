# OBS Studio Setup Guide

## Overview

This guide will walk you through setting up OBS Studio to stream to your RealCast PaaS app.

---

## Prerequisites

1. **OBS Studio** installed ([Download here](https://obsproject.com/))
2. **RealCast Account** with an app created
3. **Stream Key** from your RealCast dashboard

---

## Step 1: Get Your Stream Credentials

1. Log in to your [RealCast Dashboard](https://dashboard.realcast.io)
2. Navigate to **Apps** → Select your app
3. Go to **Streams** tab
4. Click **Create New Stream**
5. Copy your credentials:
   - **Ingest URL:** `rtmps://ingest.realcast.io/live`
   - **Stream Key:** `live_abc123_def456`

---

## Step 2: Configure OBS Studio

### Open Settings

1. Launch OBS Studio
2. Click **Settings** in the bottom right
3. Navigate to **Stream** tab

### Configure Stream Settings

1. **Service:** Select "Custom..."
2. **Server:** Enter your ingest URL
   ```
   rtmps://ingest.realcast.io/live
   ```
3. **Stream Key:** Paste your stream key
   ```
   live_abc123_def456
   ```
4. Click **OK** to save

---

## Step 3: Configure Output Settings

### Video Quality Settings

1. Go to **Settings** → **Output**
2. Set **Output Mode** to "Advanced"
3. In the **Streaming** tab:

**Recommended Settings:**

| Setting | Value | Description |
|---------|-------|-------------|
| Encoder | x264 or NVENC | Use NVENC if you have NVIDIA GPU |
| Rate Control | CBR | Constant bitrate for stable quality |
| Bitrate | 4500-6000 Kbps | Depends on your upload speed |
| Keyframe Interval | 2 seconds | Required for HLS segmentation |
| CPU Preset | veryfast | Balance between quality and CPU usage |
| Profile | high | Better quality |

### Audio Settings

1. Go to **Settings** → **Audio**
2. **Sample Rate:** 48 kHz
3. **Channels:** Stereo

---

## Step 4: Test Your Setup

### Start Streaming

1. Click **Start Streaming** in OBS
2. Wait 5-10 seconds for the stream to initialize
3. Check your RealCast dashboard - status should show **"Live"**

### Verify Stream Quality

1. Open your playback URL in a browser:
   ```
   https://cdn.realcast.io/hls/stream_abc123.m3u8
   ```
2. Use a player like VLC or your app's embedded player
3. Check for:
   - Clear video (no pixelation)
   - Smooth playback (no buffering)
   - Synchronized audio

---

## Troubleshooting

### Stream Won't Connect

**Issue:** "Connection Failed" or "Unable to connect"

**Solutions:**
1. Verify your stream key is correct
2. Check your internet connection
3. Ensure port 1935 (RTMP) is not blocked by firewall
4. Try using non-secure RTMP first: `rtmp://ingest.realcast.io/live`

### Poor Stream Quality

**Issue:** Pixelation or choppy video

**Solutions:**
1. Lower your bitrate (try 3000 Kbps)
2. Change CPU preset to "faster" or "veryfast"
3. Check your upload speed (minimum 5 Mbps recommended)
4. Close bandwidth-intensive applications

### Audio Out of Sync

**Issue:** Audio delayed or ahead of video

**Solutions:**
1. Add audio sync offset in OBS:
   - Right-click audio source → **Advanced Audio Properties**
   - Adjust **Sync Offset** (usually -200ms to +200ms)
2. Ensure audio sample rate is 48 kHz

### High CPU Usage

**Issue:** OBS consuming too much CPU

**Solutions:**
1. Use NVENC encoder (NVIDIA) or QuickSync (Intel)
2. Lower resolution (1080p → 720p)
3. Change preset to "ultrafast"
4. Reduce frame rate (60fps → 30fps)

---

## Advanced Configuration

### Multi-Bitrate Streaming

RealCast automatically transcodes your stream to multiple qualities:
- 1080p @ 6000 Kbps
- 720p @ 3000 Kbps
- 480p @ 1500 Kbps
- 360p @ 800 Kbps

Just stream at your highest quality, and viewers will automatically get the best quality for their connection.

### Custom Overlays and Scenes

1. Add text, images, or browser sources
2. Create multiple scenes for different content
3. Use Studio Mode for seamless transitions

### Recording Locally While Streaming

1. Go to **Settings** → **Output**
2. In the **Recording** tab:
   - **Recording Path:** Choose save location
   - **Recording Format:** MP4 (recommended)
   - **Recording Quality:** Same as stream
3. Click **Start Recording** alongside **Start Streaming**

---

## Best Practices

### Before Going Live

- [ ] Test audio levels (should be around -12dB to -6dB)
- [ ] Check camera focus and lighting
- [ ] Test with a private stream first
- [ ] Have backup internet connection ready
- [ ] Monitor CPU and GPU usage

### During Stream

- [ ] Monitor bitrate stability in OBS stats
- [ ] Watch dropped frames (should be <1%)
- [ ] Keep an eye on viewer count in dashboard
- [ ] Respond to chat if enabled

### After Stream

- [ ] Stop streaming properly (don't force quit)
- [ ] Review stream analytics in dashboard
- [ ] Download VOD if recording was enabled
- [ ] Check webhook logs for any issues

---

## Recommended Internet Speeds

| Quality | Resolution | Bitrate | Upload Speed Required |
|---------|------------|---------|----------------------|
| Low | 480p | 1.5 Mbps | 3 Mbps |
| Medium | 720p | 3 Mbps | 5 Mbps |
| High | 1080p 30fps | 4.5 Mbps | 7 Mbps |
| Ultra | 1080p 60fps | 6 Mbps | 10 Mbps |
| 4K | 2160p | 20 Mbps | 30 Mbps |

*Note: Always have 2x the bitrate for stable streaming*

---

## Next Steps

- [Embed Player in Your Website](./REACT_INTEGRATION.md)
- [Configure Webhooks](./WEBHOOKS.md)
- [Monitor Stream Analytics](../API.md#analytics)
- [Enable Recording & VOD](../API.md#recordings--vod)

---

## Support

Need help? Contact us:
- Email: support@realcast.io
- Discord: [RealCast Community](https://discord.gg/realcast)
- Docs: https://docs.realcast.io
