import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import DashboardLayout from '../components/DashboardLayout';
import { Copy, Play, Square, Trash2, ExternalLink, Eye, Clock, Download } from 'lucide-react';

const StreamDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [stream, setStream] = useState(null);
  const [playbackToken, setPlaybackToken] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStreamDetails();
  }, [id]);

  const fetchStreamDetails = async () => {
    try {
      const response = await api.get(`/streams/${id}`);
      setStream(response.data);
      
      // Get playback token
      const tokenResponse = await api.get(`/streams/${id}/playback-token`);
      setPlaybackToken(tokenResponse.data.token);
    } catch (error) {
      console.error('Error fetching stream details:', error);
      alert('Stream not found');
      navigate('/streams');
    } finally {
      setLoading(false);
    }
  };

  const deleteStream = async () => {
    if (!window.confirm('Are you sure you want to delete this stream?')) return;
    
    try {
      await api.delete(`/streams/${id}`);
      navigate('/streams');
    } catch (error) {
      alert('Error deleting stream: ' + (error.response?.data?.detail || error.message));
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!stream) {
    return null;
  }

  const rtmpUrl = `rtmps://ingest.yourplatform.com/live`;
  const hlsUrl = `https://cdn.yourplatform.com/hls/${stream.id}/playlist.m3u8`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{stream.title}</h1>
            <p className="text-gray-600 mt-1">{stream.description || 'No description'}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/player/${stream.id}`)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Watch
            </button>
            <button
              onClick={deleteStream}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">Status</div>
              <div className="flex items-center gap-2">
                {stream.status === 'live' ? (
                  <Play className="w-5 h-5 text-green-600" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400" />
                )}
                <span className="text-lg font-semibold capitalize">{stream.status}</span>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Viewers</div>
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                <span className="text-lg font-semibold">{stream.viewer_count || 0}</span>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Quality</div>
              <div className="text-lg font-semibold">{stream.quality || '1080p'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Recording</div>
              <div className="text-lg font-semibold">{stream.record ? 'Enabled' : 'Disabled'}</div>
            </div>
          </div>
        </div>

        {/* Streaming Configuration */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Streaming Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">RTMP Server URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={rtmpUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                />
                <button
                  onClick={() => copyToClipboard(rtmpUrl)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stream Key</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={stream.stream_key}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-mono text-sm"
                />
                <button
                  onClick={() => copyToClipboard(stream.stream_key)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                ⚠️ Keep your stream key private. Anyone with this key can stream to your channel.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">HLS Playback URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={hlsUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-mono text-sm"
                />
                <button
                  onClick={() => copyToClipboard(hlsUrl)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Playback Token (JWT)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={playbackToken}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-mono text-xs"
                />
                <button
                  onClick={() => copyToClipboard(playbackToken)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Include this token in your video player for authenticated playback.
              </p>
            </div>
          </div>
        </div>

        {/* OBS Setup Guide */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">📹 OBS Studio Setup</h3>
          <ol className="space-y-2 text-sm text-gray-700">
            <li>1. Open OBS Studio and go to <strong>Settings → Stream</strong></li>
            <li>2. Select <strong>Custom...</strong> as the Service</li>
            <li>3. Paste the RTMP Server URL above</li>
            <li>4. Paste the Stream Key above</li>
            <li>5. Click <strong>Apply</strong> and <strong>OK</strong></li>
            <li>6. Click <strong>Start Streaming</strong> to go live!</li>
          </ol>
        </div>

        {/* Metadata */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Stream Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Stream ID:</span>
              <span className="ml-2 font-mono text-gray-900">{stream.id}</span>
            </div>
            <div>
              <span className="text-gray-600">App ID:</span>
              <span className="ml-2 font-mono text-gray-900">{stream.app_id}</span>
            </div>
            <div>
              <span className="text-gray-600">Created:</span>
              <span className="ml-2 text-gray-900">{new Date(stream.created_at).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-600">Updated:</span>
              <span className="ml-2 text-gray-900">{new Date(stream.updated_at).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StreamDetails;