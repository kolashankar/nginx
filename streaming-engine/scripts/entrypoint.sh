#!/bin/bash
set -e

# Generate HLS encryption keys
/usr/local/bin/generate-keys.sh

# Display configuration info
echo "========================================"
echo "Universal NGINX Streaming Engine"
echo "========================================"
echo "RTMP Port: 1935"
echo "HTTP Port: 8080"
echo "HTTPS Port: 8443"
echo ""
echo "RTMP Ingest URL: rtmp://localhost:1935/live/{stream_key}"
echo "HLS Playback: http://localhost:8080/hls/{stream_key}.m3u8"
echo "Statistics: http://localhost:8080/stat"
echo "========================================"

# Execute the main command
exec "$@"