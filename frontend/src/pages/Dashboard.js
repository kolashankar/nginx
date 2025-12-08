import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { appsAPI, streamsAPI } from '../utils/api';
import { Box, Video, Users, Activity, Plus, ArrowRight } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalApps: 0,
    totalStreams: 0,
    liveStreams: 0,
    totalViewers: 0
  });
  const [recentApps, setRecentApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const appsResponse = await appsAPI.list();
      const apps = appsResponse.data;
      
      setStats(prev => ({
        ...prev,
        totalApps: apps.length
      }));
      
      setRecentApps(apps.slice(0, 5));
      
      // Fetch streams for each app
      let totalStreams = 0;
      let liveStreams = 0;
      
      for (const app of apps) {
        try {
          const streamsResponse = await streamsAPI.list(app.id);
          const streams = streamsResponse.data;
          totalStreams += streams.length;
          liveStreams += streams.filter(s => s.status === 'live').length;
        } catch (error) {
          console.error(`Error fetching streams for app ${app.id}:`, error);
        }
      }
      
      setStats(prev => ({
        ...prev,
        totalStreams,
        liveStreams
      }));
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Apps',
      value: stats.totalApps,
      icon: Box,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Total Streams',
      value: stats.totalStreams,
      icon: Video,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Live Streams',
      value: stats.liveStreams,
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Total Viewers',
      value: stats.totalViewers,
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back!</h1>
          <p className="text-gray-600 mt-1">Here's what's happening with your apps today.</p>
        </div>
        <Link to="/apps/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create App
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  </div>
                  <div className={`${stat.bgColor} p-3 rounded-lg`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Apps */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Apps</CardTitle>
              <CardDescription>Your recently created applications</CardDescription>
            </div>
            <Link to="/apps">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentApps.length === 0 ? (
            <div className="text-center py-12">
              <Box className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No apps yet</h3>
              <p className="text-gray-600 mb-4">Get started by creating your first app</p>
              <Link to="/apps/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First App
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentApps.map((app) => (
                <Link
                  key={app.id}
                  to={`/apps/${app.id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{app.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{app.description || 'No description'}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link to="/streams">
            <CardContent className="p-6">
              <Video className="w-8 h-8 text-purple-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">Manage Streams</h3>
              <p className="text-sm text-gray-600">View and configure your live streams</p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link to="/api-keys">
            <CardContent className="p-6">
              <Key className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">API Keys</h3>
              <p className="text-sm text-gray-600">Generate and manage your API credentials</p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link to="/webhooks">
            <CardContent className="p-6">
              <Webhook className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">Webhooks</h3>
              <p className="text-sm text-gray-600">Configure event notifications</p>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
