import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { appsAPI } from '../utils/api';
import { Plus, Box, ArrowRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const Apps = () => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      const response = await appsAPI.list();
      setApps(response.data);
    } catch (error) {
      toast.error('Failed to fetch apps');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApp = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      await appsAPI.create(formData);
      toast.success('App created successfully!');
      setCreateDialogOpen(false);
      setFormData({ name: '', description: '' });
      fetchApps();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create app');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteApp = async (appId, appName) => {
    if (!window.confirm(`Are you sure you want to delete "${appName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await appsAPI.delete(appId);
      toast.success('App deleted successfully');
      fetchApps();
    } catch (error) {
      toast.error('Failed to delete app');
    }
  };

  if (loading) {
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
          <h1 className="text-3xl font-bold text-gray-900">Apps</h1>
          <p className="text-gray-600 mt-1">Manage your applications and projects</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create App
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New App</DialogTitle>
              <DialogDescription>
                Create a new application to start streaming
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateApp} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">App Name</Label>
                <Input
                  id="name"
                  placeholder="My Streaming App"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={creating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="A brief description of your app"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={creating}
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create App'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {apps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Box className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No apps yet</h3>
            <p className="text-gray-600 mb-6 text-center max-w-sm">
              Create your first app to get started with live streaming and real-time features
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First App
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps.map((app) => (
            <Card key={app.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{app.name}</span>
                  <Box className="w-5 h-5 text-blue-600 flex-shrink-0" />
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {app.description || 'No description'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Link to={`/apps/${app.id}`}>
                    <Button variant="outline" size="sm">
                      View Details
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteApp(app.id, app.name)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Apps;