import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { appsAPI, streamsAPI } from '../utils/api';
import { Plus, Video, Circle, ArrowRight, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const Streams = () => {
  const [apps, setApps] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    fetchApps();
  }, []);

  useEffect(() => {
    if (selectedApp) {
      fetchStreams(selectedApp);
    }
  }, [selectedApp]);

  const fetchApps = async () => {
    try {
      const response = await appsAPI.list();
      setApps(response.data);
      if (response.data.length > 0) {
        setSelectedApp(response.data[0].id);
      }
    } catch (error) {
      toast.error('Failed to fetch apps');
    } finally {
      setLoading(false);
    }
  };

  const fetchStreams = async (appId) => {
    try {
      setLoading(true);
      const response = await streamsAPI.list(appId);
      setStreams(response.data);
    } catch (error) {
      toast.error('Failed to fetch streams');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStream = async (e) => {
    e.preventDefault();
    if (!selectedApp) {
      toast.error('Please select an app first');
      return;
    }

    setCreating(true);
    try {
      await streamsAPI.create(selectedApp, formData);
      toast.success('Stream created successfully!');
      setCreateDialogOpen(false);
      setFormData({ title: '', description: '' });
      fetchStreams(selectedApp);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create stream');
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      live: { variant: 'default', color: 'bg-green-500', text: 'Live' },
      offline: { variant: 'secondary', color: 'bg-gray-500', text: 'Offline' },
      ended: { variant: 'outline', color: 'bg-red-500', text: 'Ended' }
    };

    const config = statusConfig[status] || statusConfig.offline;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Circle className={`w-2 h-2 ${config.color}`} fill="currentColor" />
        {config.text}
      </Badge>
    );
  };

  if (loading && apps.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Streams</h1>
          <p className="text-gray-600 mt-1">Manage your live streams</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!selectedApp}>
              <Plus className="w-4 h-4 mr-2" />
              Create Stream
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Stream</DialogTitle>
              <DialogDescription>
                Create a new live stream for your app
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateStream} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Stream Title</Label>
                <Input
                  id="title"
                  placeholder="My Live Stream"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Stream description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={creating} className="flex-1">
                  {creating ? 'Creating...' : 'Create Stream'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {apps.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Video className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No apps found</h3>
            <p className="text-gray-600 mb-4">Create an app first to start streaming</p>
            <Link to="/apps">
              <Button>Go to Apps</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex gap-4 items-center">
            <Label htmlFor="app-select" className="text-sm font-medium">Select App:</Label>
            <Select value={selectedApp} onValueChange={setSelectedApp}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select an app" />
              </SelectTrigger>
              <SelectContent>
                {apps.map((app) => (
                  <SelectItem key={app.id} value={app.id}>
                    {app.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : streams.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Video className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No streams yet</h3>
                <p className="text-gray-600 mb-4">Create your first stream to get started</p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Stream
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {streams.map((stream) => (
                <Card key={stream.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{stream.title || 'Untitled Stream'}</CardTitle>
                        <CardDescription className="mt-1">
                          {stream.description || 'No description'}
                        </CardDescription>
                      </div>
                      {getStatusBadge(stream.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-gray-500">Stream Key</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(stream.stream_key, `key-${stream.id}`)}
                          className="h-6 px-2"
                        >
                          {copiedKey === `key-${stream.id}` ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                      <code className="block text-xs bg-gray-100 p-2 rounded border break-all">
                        {stream.stream_key}
                      </code>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                      <div>
                        <p className="text-xs text-gray-500">Viewers</p>
                        <p className="text-lg font-semibold">{stream.viewer_count || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Duration</p>
                        <p className="text-lg font-semibold">{stream.duration || '0m'}</p>
                      </div>
                    </div>

                    <Link to={`/streams/${stream.id}`} className="block">
                      <Button variant="outline" className="w-full mt-2">
                        View Details
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Streams;
