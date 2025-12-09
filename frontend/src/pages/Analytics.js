import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { appsAPI, analyticsAPI } from '../utils/api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, Users, Clock, Video, TrendingUp, Database } from 'lucide-react';
import { toast } from 'sonner';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const Analytics = () => {
  const [apps, setApps] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetchApps();
  }, []);

  useEffect(() => {
    if (selectedApp) {
      fetchAnalytics(selectedApp, timeRange);
    }
  }, [selectedApp, timeRange]);

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

  const fetchAnalytics = async (appId, range) => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getOverview(appId, range);
      setAnalytics(response.data);
    } catch (error) {
      toast.error('Failed to fetch analytics');
      // Set mock data for demonstration
      setAnalytics({
        total_streams: 15,
        total_viewers: 1234,
        total_duration: 450,
        bandwidth_used: 145.6,
        peak_concurrent: 89,
        avg_watch_time: 12.5,
        viewer_trend: [
          { date: 'Mon', viewers: 45 },
          { date: 'Tue', viewers: 67 },
          { date: 'Wed', viewers: 89 },
          { date: 'Thu', viewers: 56 },
          { date: 'Fri', viewers: 78 },
          { date: 'Sat', viewers: 95 },
          { date: 'Sun', viewers: 82 }
        ],
        stream_duration: [
          { name: 'Short (< 10m)', value: 30 },
          { name: 'Medium (10-30m)', value: 45 },
          { name: 'Long (> 30m)', value: 25 }
        ],
        bandwidth_trend: [
          { date: 'Mon', bandwidth: 12 },
          { date: 'Tue', bandwidth: 19 },
          { date: 'Wed', bandwidth: 25 },
          { date: 'Thu', bandwidth: 18 },
          { date: 'Fri', bandwidth: 22 },
          { date: 'Sat', bandwidth: 28 },
          { date: 'Sun', bandwidth: 24 }
        ]
      });
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Monitor your streaming performance and usage</p>
        </div>
      </div>

      {apps.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No apps found</h3>
            <p className="text-gray-600">Create an app to view analytics</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex gap-4 items-center">
            <div className="flex gap-4 items-center flex-1">
              <Label htmlFor="app-select" className="text-sm font-medium">App:</Label>
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

            <div className="flex gap-4 items-center">
              <Label htmlFor="time-range" className="text-sm font-medium">Time Range:</Label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : analytics ? (
            <>
              {/* Key Metrics */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Streams</CardTitle>
                    <Video className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.total_streams}</div>
                    <p className="text-xs text-gray-500 mt-1">Live sessions created</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Viewers</CardTitle>
                    <Users className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.total_viewers.toLocaleString()}</div>
                    <p className="text-xs text-gray-500 mt-1">Peak: {analytics.peak_concurrent}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Watch Time</CardTitle>
                    <Clock className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.total_duration}h</div>
                    <p className="text-xs text-gray-500 mt-1">Avg: {analytics.avg_watch_time}m</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Bandwidth</CardTitle>
                    <Database className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.bandwidth_used} GB</div>
                    <p className="text-xs text-gray-500 mt-1">Data transferred</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Viewer Trend</CardTitle>
                    <CardDescription>Daily viewer count over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analytics.viewer_trend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="viewers" stroke="#3b82f6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Bandwidth Usage</CardTitle>
                    <CardDescription>Daily bandwidth consumption (GB)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.bandwidth_trend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="bandwidth" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Stream Duration Distribution</CardTitle>
                    <CardDescription>Breakdown by stream length</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analytics.stream_duration}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {analytics.stream_duration.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Performance Summary</CardTitle>
                    <CardDescription>Key performance indicators</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b">
                        <span className="text-sm text-gray-600">Average Stream Duration</span>
                        <span className="text-sm font-semibold">{(analytics.total_duration / analytics.total_streams).toFixed(1)}h</span>
                      </div>
                      <div className="flex items-center justify-between pb-2 border-b">
                        <span className="text-sm text-gray-600">Average Viewers per Stream</span>
                        <span className="text-sm font-semibold">{Math.round(analytics.total_viewers / analytics.total_streams)}</span>
                      </div>
                      <div className="flex items-center justify-between pb-2 border-b">
                        <span className="text-sm text-gray-600">Peak Concurrent Viewers</span>
                        <span className="text-sm font-semibold">{analytics.peak_concurrent}</span>
                      </div>
                      <div className="flex items-center justify-between pb-2 border-b">
                        <span className="text-sm text-gray-600">Bandwidth per Stream</span>
                        <span className="text-sm font-semibold">{(analytics.bandwidth_used / analytics.total_streams).toFixed(2)} GB</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Average Watch Time</span>
                        <span className="text-sm font-semibold">{analytics.avg_watch_time} minutes</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Activity className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No analytics data</h3>
                <p className="text-gray-600">Start streaming to see analytics</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default Analytics;
