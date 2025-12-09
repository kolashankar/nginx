import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';
import DashboardLayout from '../components/DashboardLayout';
import { Webhook, Plus, Trash2, CheckCircle, XCircle, Clock, Send } from 'lucide-react';

const Webhooks = () => {
  const { appId } = useParams();
  const [webhooks, setWebhooks] = useState([]);
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(null);
  const [formData, setFormData] = useState({
    app_id: appId || '',
    url: '',
    events: [],
    secret: '',
    enabled: true
  });

  const availableEvents = [
    'stream.live',
    'stream.offline',
    'stream.error',
    'viewer.joined',
    'viewer.left',
    'viewer.count.update',
    'chat.message.new',
    'chat.message.deleted',
    'recording.started',
    'recording.ready',
    'user.banned',
    'user.unbanned'
  ];

  useEffect(() => {
    fetchWebhooks();
    if (appId) {
      setFormData(prev => ({ ...prev, app_id: appId }));
    }
  }, [appId]);

  const fetchWebhooks = async () => {
    try {
      const endpoint = appId ? `/apps/${appId}/webhooks` : '/webhooks';
      const response = await api.get(endpoint);
      setWebhooks(response.data.webhooks || []);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWebhookLogs = async (webhookId) => {
    try {
      const response = await api.get(`/webhooks/${webhookId}/logs`);
      setWebhookLogs(response.data.logs || []);
    } catch (error) {
      console.error('Error fetching webhook logs:', error);
    }
  };

  const createWebhook = async (e) => {
    e.preventDefault();
    try {
      await api.post('/webhooks', formData);
      setShowCreateModal(false);
      setFormData({
        app_id: appId || '',
        url: '',
        events: [],
        secret: '',
        enabled: true
      });
      fetchWebhooks();
    } catch (error) {
      alert('Error creating webhook: ' + (error.response?.data?.detail || error.message));
    }
  };

  const deleteWebhook = async (webhookId) => {
    if (!window.confirm('Are you sure you want to delete this webhook?')) return;
    
    try {
      await api.delete(`/webhooks/${webhookId}`);
      fetchWebhooks();
    } catch (error) {
      alert('Error deleting webhook: ' + (error.response?.data?.detail || error.message));
    }
  };

  const testWebhook = async (webhookId) => {
    setTestingWebhook(webhookId);
    try {
      const response = await api.post(`/webhooks/${webhookId}/test`);
      alert('Test webhook sent! Check your endpoint logs.');
    } catch (error) {
      alert('Error testing webhook: ' + (error.response?.data?.detail || error.message));
    } finally {
      setTestingWebhook(null);
    }
  };

  const toggleEvent = (event) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  const generateSecret = () => {
    const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    setFormData(prev => ({ ...prev, secret }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Webhooks</h1>
            <p className="text-gray-600 mt-1">Receive real-time events from your streams</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Webhook
          </button>
        </div>

        {/* Webhooks List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : webhooks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <Webhook className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No webhooks configured</h3>
            <p className="text-gray-600 mb-4">Add a webhook endpoint to receive real-time events</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Add Webhook
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <code className="text-sm font-mono bg-gray-100 px-3 py-1 rounded">
                        {webhook.url}
                      </code>
                      {webhook.enabled ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {webhook.events.map((event) => (
                        <span
                          key={event}
                          className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                        >
                          {event}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => testWebhook(webhook.id)}
                      disabled={testingWebhook === webhook.id}
                      className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      {testingWebhook === webhook.id ? 'Testing...' : 'Test'}
                    </button>
                    <button
                      onClick={() => deleteWebhook(webhook.id)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 text-sm">
                  <div>
                    <span className="text-gray-600">Created:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(webhook.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Deliveries:</span>
                    <span className="ml-2 text-gray-900">{webhook.total_deliveries || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Success Rate:</span>
                    <span className="ml-2 text-gray-900">
                      {webhook.total_deliveries > 0
                        ? Math.round(((webhook.successful_deliveries || 0) / webhook.total_deliveries) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Webhook Integration Guide */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">🔧 Webhook Integration Guide</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>1. Endpoint Requirements:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Must respond with HTTP 200-299 status code</li>
              <li>Should respond within 5 seconds</li>
              <li>Must be accessible via HTTPS (recommended)</li>
            </ul>
            <p className="mt-3"><strong>2. Payload Format:</strong></p>
            <pre className="bg-white p-3 rounded border border-purple-200 mt-2 overflow-x-auto">
{`{
  "event": "stream.live",
  "timestamp": "2024-12-09T10:30:00Z",
  "data": {
    "stream_id": "abc123",
    "app_id": "xyz789"
  }
}`}
            </pre>
            <p className="mt-3"><strong>3. Security:</strong> All webhooks are signed with HMAC-SHA256. Verify the signature in the <code>X-Webhook-Signature</code> header.</p>
          </div>
        </div>
      </div>

      {/* Create Webhook Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 my-8">
            <h2 className="text-2xl font-bold mb-4">Add Webhook Endpoint</h2>
            <form onSubmit={createWebhook} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint URL</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://your-domain.com/webhooks"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Events to Subscribe</label>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {availableEvents.map((event) => (
                    <label key={event} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={formData.events.includes(event)}
                        onChange={() => toggleEvent(event)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{event}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Select all events you want to receive at this endpoint
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Secret (Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.secret}
                    onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                    placeholder="Used for HMAC signature verification"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={generateSecret}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Generate
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Generate a secure secret to verify webhook signatures
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="enabled" className="ml-2 text-sm text-gray-700">
                  Enable webhook immediately
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Webhook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Webhooks;