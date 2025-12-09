import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { appsAPI, webhooksAPI } from '../utils/api';
import { Plus, Webhook, Trash2, Edit, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const WEBHOOK_EVENTS = [
  { id: 'stream.live', name: 'Stream Live', description: 'Triggered when a stream goes live' },
  { id: 'stream.offline', name: 'Stream Offline', description: 'Triggered when a stream ends' },
  { id: 'stream.error', name: 'Stream Error', description: 'Triggered on stream errors' },
  { id: 'viewer.joined', name: 'Viewer Joined', description: 'New viewer joined' },
  { id: 'viewer.left', name: 'Viewer Left', description: 'Viewer left the stream' },
  { id: 'chat.message.new', name: 'New Chat Message', description: 'New chat message sent' },
  { id: 'recording.ready', name: 'Recording Ready', description: 'VOD recording is ready' }
];

const Webhooks = () => {
  const [apps, setApps] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ url: '', events: [] });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchApps();
  }, []);

  useEffect(() => {
    if (selectedApp) {
      fetchWebhooks(selectedApp);
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

  const fetchWebhooks = async (appId) => {
    try {
      setLoading(true);
      const response = await webhooksAPI.list(appId);
      setWebhooks(response.data);
    } catch (error) {
      toast.error('Failed to fetch webhooks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWebhook = async (e) => {
    e.preventDefault();
    if (!selectedApp) {
      toast.error('Please select an app first');
      return;
    }

    if (formData.events.length === 0) {
      toast.error('Please select at least one event');
      return;
    }

    setCreating(true);
    try {
      await webhooksAPI.create(selectedApp, formData);
      toast.success('Webhook created successfully!');
      setCreateDialogOpen(false);
      setFormData({ url: '', events: [] });
      fetchWebhooks(selectedApp);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create webhook');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWebhook = async (webhookId) => {
    if (!window.confirm('Are you sure you want to delete this webhook?')) {
      return;
    }

    try {
      await webhooksAPI.delete(selectedApp, webhookId);
      toast.success('Webhook deleted successfully');
      fetchWebhooks(selectedApp);
    } catch (error) {
      toast.error('Failed to delete webhook');
    }
  };

  const toggleEvent = (eventId) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId]
    }));
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
          <h1 className="text-3xl font-bold text-gray-900">Webhooks</h1>
          <p className="text-gray-600 mt-1">Configure webhook endpoints for real-time events</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!selectedApp}>
              <Plus className="w-4 h-4 mr-2" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Webhook</DialogTitle>
              <DialogDescription>
                Configure a webhook to receive real-time events
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateWebhook} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="url">Webhook URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://your-domain.com/webhooks"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  required
                />
                <p className="text-xs text-gray-500">Events will be sent to this URL via HTTP POST</p>
              </div>

              <div className="space-y-3">
                <Label>Select Events</Label>
                <div className="border rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                  {WEBHOOK_EVENTS.map((event) => (
                    <div key={event.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
                      <Checkbox
                        id={event.id}
                        checked={formData.events.includes(event.id)}
                        onCheckedChange={() => toggleEvent(event.id)}
                      />
                      <div className="flex-1">
                        <label htmlFor={event.id} className="text-sm font-medium cursor-pointer">
                          {event.name}
                        </label>
                        <p className="text-xs text-gray-500">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  {formData.events.length} event{formData.events.length !== 1 ? 's' : ''} selected
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={creating} className="flex-1">
                  {creating ? 'Creating...' : 'Create Webhook'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {apps.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Webhook className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No apps found</h3>
            <p className="text-gray-600">Create an app first to configure webhooks</p>
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
          ) : webhooks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Webhook className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No webhooks configured</h3>
                <p className="text-gray-600 mb-4">Add a webhook to receive real-time events</p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Webhook
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <Card key={webhook.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg break-all">{webhook.url}</CardTitle>
                        <CardDescription className="mt-1">
                          {webhook.events?.length || 0} event{webhook.events?.length !== 1 ? 's' : ''} subscribed
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={webhook.enabled ? 'default' : 'secondary'}>
                          {webhook.enabled ? (
                            <><Check className="w-3 h-3 mr-1" /> Active</>
                          ) : (
                            <><X className="w-3 h-3 mr-1" /> Inactive</>
                          )}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-gray-500">Subscribed Events</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {webhook.events?.map((eventId) => {
                            const event = WEBHOOK_EVENTS.find(e => e.id === eventId);
                            return (
                              <Badge key={eventId} variant="outline" className="text-xs">
                                {event?.name || eventId}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-3 border-t">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteWebhook(webhook.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
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

export default Webhooks;
