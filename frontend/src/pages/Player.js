import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import VideoPlayer from '../components/VideoPlayer';
import ChatWidget from '../components/ChatWidget';
import { streamsAPI } from '../utils/api';
import { Users, Circle } from 'lucide-react';
import { toast } from 'sonner';

const Player = () => {
  const [searchParams] = useSearchParams();
  const streamId = searchParams.get('streamId');
  const appId = searchParams.get('appId');
  
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    if (streamId && appId) {
      fetchStream();
    }
  }, [streamId, appId]);

  const fetchStream = async () => {
    try {
      const response = await streamsAPI.get(appId, streamId);
      setStream(response.data);
      setViewerCount(response.data.viewer_count || 0);
    } catch (error) {
      toast.error('Failed to load stream');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Stream not found</h3>
            <p className="text-gray-600">The stream you're looking for doesn't exist or has been removed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Video Player Section */}
          <div className="lg:col-span-2 space-y-4">
            <VideoPlayer streamId={streamId} appId={appId} />
            
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{stream.title || 'Untitled Stream'}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{stream.description || 'No description'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={stream.status === 'live' ? 'default' : 'secondary'} className="gap-1">
                      <Circle className={`w-2 h-2 ${stream.status === 'live' ? 'bg-green-500' : 'bg-gray-500'}`} fill="currentColor" />
                      {stream.status === 'live' ? 'Live' : 'Offline'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium">{viewerCount} viewers</span>
                  </div>
                  {stream.started_at && (
                    <div className="text-sm text-gray-600">
                      Started {new Date(stream.started_at).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Section */}
          <div className="lg:col-span-1">
            <ChatWidget streamId={streamId} appId={appId} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Player;
