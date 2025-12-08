import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { appsAPI, apiKeysAPI, streamsAPI, webhooksAPI } from '../utils/api';
import { ArrowLeft, Copy, Key, Video, Webhook, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const AppDetails = () => {
  const { appId } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [streams, setStreams] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppDetails();
  }, [appId]);

  const fetchAppDetails = async () => {
    try {
      const [appRes, keysRes, streamsRes, webhooksRes] = await Promise.all([
        appsAPI.get(appId),
        apiKeysAPI.list(appId),
        streamsAPI.list(appId),
        webhooksAPI.list(appId)
      ]);
      
      setApp(appRes.data);
      setApiKeys(keysRes.data);
      setStreams(streamsRes.data);
      setWebhooks(webhooksRes.data);
    } catch (error) {
      toast.error('Failed to fetch app details');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleGenerateApiKey = async () => {
    try {
      await apiKeysAPI.generate(appId);
      toast.success('API Key generated successfully');
      fetchAppDetails();
    } catch (error) {
      toast.error('Failed to generate API Key');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">App not found</p>
        <Button onClick={() => navigate('/apps')} className="mt-4">
          Back to Apps
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/apps')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{app.name}</h1>
            <p className="text-gray-600 mt-1">{app.description || 'No description'}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="api-keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="api-keys">
            <Key className="w-4 h-4 mr-2" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="streams">
            <Video className="w-4 h-4 mr-2" />
            Streams
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <Webhook className="w-4 h-4 mr-2" />
            Webhooks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>Manage your application API keys</CardDescription>
                </div>
                <Button onClick={handleGenerateApiKey} size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate New Key
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {apiKeys.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No API keys yet. Generate one to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs text-gray-500">API Key</Label>
                          <div className="flex items-center space-x-2 mt-1">
                            <code className="flex-1 bg-gray-50 px-3 py-2 rounded text-sm font-mono">
                              {key.api_key}
                            </code>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(key.api_key, 'API Key')}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">API Secret</Label>
                          <div className="flex items-center space-x-2 mt-1">
                            <code className="flex-1 bg-gray-50 px-3 py-2 rounded text-sm font-mono">
                              {key.api_secret}
                            </code>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(key.api_secret, 'API Secret')}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <Badge variant={key.is_active ? 'success' : 'secondary'}>
                            {key.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            Created: {new Date(key.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="streams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Streams</CardTitle>
              <CardDescription>View and manage your streams</CardDescription>
            </CardHeader>
            <CardContent>
              {streams.length === 0 ? (
                <div className="text-center py-8">
                  <Video className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No streams yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {streams.map((stream) => (
                    <div key={stream.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{stream.name}</h4>
                          <p className="text-sm text-gray-600">{stream.description}</p>
                        </div>
                        <Badge variant={stream.status === 'live' ? 'success' : 'secondary'}>
                          {stream.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>Configure webhook endpoints</CardDescription>
            </CardHeader>
            <CardContent>
              {webhooks.length === 0 ? (
                <div className="text-center py-8">
                  <Webhook className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No webhooks configured.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {webhooks.map((webhook) => (
                    <div key={webhook.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <code className="text-sm">{webhook.url}</code>
                          <div className="flex items-center space-x-2 mt-2">
                            {webhook.events.map((event) => (
                              <Badge key={event} variant="outline" className="text-xs">
                                {event}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Badge variant={webhook.is_active ? 'success' : 'secondary'}>
                          {webhook.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Label = ({ children, className }) => (
  <label className={`text-sm font-medium ${className}`}>{children}</label>
);

export default AppDetails;