# OBS Studio Setup Guide for RealCast

Complete guide to streaming to RealCast using OBS Studio.

---

## Prerequisites

- OBS Studio 28.0 or higher ([Download](https://obsproject.com/))
- RealCast account with an active app
- Stream key from RealCast

---

## Step 1: Get Your Stream Credentials

### Via Dashboard

1. Login to [RealCast Dashboard](https://dashboard.realcast.io)
2. Navigate to your App
3. Click "Streams" tab
4. Click "Create Stream"
5. Copy the **Stream Key** and **RTMP URL**

### Via API

```bash
curl -X POST https://api.realcast.io/api/streams \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "your_app_id",
    "title": "My Stream",
    "description": "Live from OBS"
  }'
```

Save these values:
- **RTMP URL:** `rtmps://ingest.realcast.io/live`
- **Stream Key:** `app_xyz789_stream_qwe456_sk_abc123...`

---

## Step 2: Configure OBS Studio

### Open Settings

1. Launch OBS Studio
2. Click **File** > **Settings** (or **OBS** > **Preferences** on Mac)
3. Navigate to **Stream** tab

### Configure Stream Settings

1. **Service:** Select `Custom...`
2. **Server:** Enter `rtmps://ingest.realcast.io/live`
3. **Stream Key:** Paste your stream key
4. Click **OK**

![OBS Stream Settings](https://docs.realcast.io/images/obs-stream-settings.png)

---

## Step 3: Optimize Output Settings

### For Gaming (High Quality)

1. Go to **Settings** > **Output**
2. Set **Output Mode** to `Advanced`
3. **Streaming** tab:
   - **Encoder:** NVIDIA NVENC H.264 (GPU) or x264 (CPU)
   - **Rate Control:** CBR
   - **Bitrate:** 6000 Kbps (for 1080p60)
   - **Keyframe Interval:** 2 seconds
   - **Preset:** Quality (NVENC) or veryfast (x264)
   - **Profile:** high
   - **GPU:** 0 (if using NVENC)

### For Standard Streaming

- **1080p30:** 4500-5000 Kbps
- **720p60:** 4500-6000 Kbps
- **720p30:** 2500-4000 Kbps
- **480p30:** 1000-2000 Kbps

---

## Step 4: Audio Settings

1. Go to **Settings** > **Audio**
2. **Sample Rate:** 48 kHz
3. **Channels:** Stereo
4. **Desktop Audio:** Select your system audio
5. **Mic/Auxiliary Audio:** Select your microphone

### Audio Bitrate

1. Go to **Settings** > **Output** > **Audio**
2. Set **Audio Bitrate** to:
   - 160 kbps (recommended)
   - 192 kbps (high quality)
   - 128 kbps (bandwidth limited)

---

## Step 5: Video Settings

1. Go to **Settings** > **Video**
2. **Base (Canvas) Resolution:** Your monitor resolution
3. **Output (Scaled) Resolution:** 
   - 1920x1080 (Full HD)
   - 1280x720 (HD)
4. **Downscale Filter:** Lanczos (best quality)
5. **FPS:** 
   - 60 (gaming, fast motion)
   - 30 (standard content)

---

## Step 6: Scene Setup

### Basic Scene

1. Click **+** in the **Scenes** panel
2. Name it "Main Scene"
3. Add sources:
   - **Game Capture** - For games
   - **Display Capture** - For screen sharing
   - **Window Capture** - For specific windows
   - **Video Capture Device** - For webcam
   - **Image** - For overlays
   - **Text** - For labels

### Gaming Scene Example

```
Sources (top to bottom):
1. Text - Stream Title
2. Image - Overlay/Frame
3. Video Capture Device - Webcam (corner)
4. Game Capture - Your game
5. Image - Background
```

---

## Step 7: Start Streaming

1. Click **Start Streaming** button
2. OBS will connect to RealCast
3. Check for "green square" indicator (streaming active)
4. Monitor stats in OBS status bar:
   - **CPU usage**
   - **FPS**
   - **Dropped frames**
   - **Bitrate**

### Verify Stream is Live

```bash
curl -X GET https://api.realcast.io/api/streams/YOUR_STREAM_ID/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response should show:
```json
{
  "status": "live",
  "viewer_count": 0,
  "started_at": "2024-12-09T10:00:00Z"
}
```

---

## Troubleshooting

### Connection Failed

**Error:** "Failed to connect to server"

**Solutions:**
1. Verify RTMP URL is `rtmps://ingest.realcast.io/live`
2. Check stream key is correct
3. Ensure port 1935 is not blocked by firewall
4. Try switching to `rtmp://` (non-secure) temporarily
5. Check internet connection

### High CPU Usage

**Solutions:**
1. Switch to GPU encoder (NVENC/QuickSync)
2. Lower output resolution
3. Reduce frame rate to 30 FPS
4. Change x264 preset to `veryfast` or `ultrafast`
5. Close unnecessary applications

### Dropped Frames

**Solutions:**
1. Lower bitrate by 1000-2000 Kbps
2. Check upload speed (should be 2x your bitrate)
3. Close bandwidth-heavy applications
4. Use wired connection instead of WiFi
5. Switch to lower resolution

### Lag or Buffering for Viewers

**Solutions:**
1. Lower bitrate
2. Set keyframe interval to exactly 2 seconds
3. Check if upload speed is stable
4. Restart stream

### Black Screen in Stream

**Solutions:**
1. Run OBS as Administrator (Windows)
2. Use Display Capture instead of Game Capture
3. Update GPU drivers
4. Check game capture properties:
   - Mode: "Capture specific window"
   - Select your game
5. Try Window Capture mode

---

## Advanced Settings

### Multi-Bitrate Streaming

RealCast automatically transcodes your stream to multiple qualities:
- 1080p (source quality)
- 720p
- 480p
- 360p

Viewers can choose based on their connection.

### Recording While Streaming

1. Go to **Settings** > **Output**
2. **Recording** tab:
   - **Recording Path:** Choose folder
   - **Recording Format:** MP4 or MKV
   - **Encoder:** Same as streaming (less CPU) or separate
3. Click **Start Recording** alongside streaming

### Multistreaming

Stream to RealCast and other platforms simultaneously:

1. Install **OBS-VirtualCam** plugin
2. Use **Restream.io** or **Castr** service
3. Or set up multiple RTMP outputs via Advanced Scene Switcher

---

## Recommended Plugins

### Essential Plugins

1. **StreamFX** - Advanced effects and filters
2. **Source Clone** - Duplicate sources
3. **Move Transition** - Smooth scene transitions
4. **NDI Plugin** - Network sources

### Install Plugins

1. Download from [OBS Forums](https://obsproject.com/forum/resources/)
2. Close OBS
3. Run plugin installer
4. Restart OBS

---

## Best Practices

### Pre-Stream Checklist

- [ ] Test stream for 5 minutes before going live
- [ ] Check audio levels (not clipping)
- [ ] Verify microphone is unmuted
- [ ] Test all scenes and transitions
- [ ] Have backup internet connection ready
- [ ] Close unnecessary applications
- [ ] Set "Do Not Disturb" mode

### During Stream

- Monitor OBS stats (CPU, dropped frames)
- Watch chat for viewer feedback
- Keep backup recordings
- Have emergency "Be Right Back" scene ready

### After Stream

- Stop recording and streaming
- Save local recording backup
- Review stream analytics
- Check for VOD on RealCast

---

## Support

Need help?

- RealCast Discord: https://discord.gg/realcast
- OBS Forums: https://obsproject.com/forum/
- Email: support@realcast.io

---

**Happy Streaming!** 🎉
