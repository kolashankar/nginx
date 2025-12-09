import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';
import DashboardLayout from '../components/DashboardLayout';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Clock, Activity, Download, Calendar } from 'lucide-react';

const Analytics = () => {
  const { appId } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [appId, timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const endpoint = appId
        ? `/advanced-analytics/apps/${appId}/overview?time_range=${timeRange}`
        : `/advanced-analytics/overview?time_range=${timeRange}`;
      const response = await api.get(endpoint);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const timeRangeOptions = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' }
  ];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Mock data for demonstration (replace with actual API data)
  const viewerData = [
    { time: '00:00', viewers: 120 },
    { time: '04:00', viewers: 80 },
    { time: '08:00', viewers: 200 },
    { time: '12:00', viewers: 350 },
    { time: '16:00', viewers: 420 },
    { time: '20:00', viewers: 380 },
    { time: '24:00', viewers: 250 }
  ];

  const bandwidthData = [
    { date: 'Mon', bandwidth: 45 },
    { date: 'Tue', bandwidth: 52 },
    { date: 'Wed', bandwidth: 61 },
    { date: 'Thu', bandwidth: 58 },
    { date: 'Fri', bandwidth: 70 },
    { date: 'Sat', bandwidth: 85 },
    { date: 'Sun', bandwidth: 78 }
  ];

  const streamQualityData = [
    { name: '1080p', value: 45 },
    { name: '720p', value: 30 },
    { name: '480p', value: 20 },
    { name: '360p', value: 5 }
  ];

  const chatActivityData = [
    { hour: '00:00', messages: 45 },
    { hour: '04:00', messages: 20 },
    { hour: '08:00', messages: 120 },
    { hour: '12:00', messages: 250 },
    { hour: '16:00', messages: 380 },
    { hour: '20:00', messages: 420 },
    { hour: '24:00', messages: 180 }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-1">Monitor your streaming performance and engagement</p>
          </div>
          <div className="flex gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {timeRangeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Total Views</div>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {analytics?.total_views?.toLocaleString() || '12,458'}
            </div>
            <div className="text-sm text-green-600 flex items-center gap-1">
              <span>↑ 12.5%</span>
              <span className="text-gray-500">vs last period</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Peak Viewers</div>
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {analytics?.peak_viewers?.toLocaleString() || '2,847'}
            </div>
            <div className="text-sm text-green-600 flex items-center gap-1">
              <span>↑ 8.2%</span>
              <span className="text-gray-500">vs last period</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Avg Watch Time</div>
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {analytics?.avg_watch_time || '24m'}
            </div>
            <div className="text-sm text-red-600 flex items-center gap-1">
              <span>↓ 3.1%</span>
              <span className="text-gray-500">vs last period</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Bandwidth Used</div>
              <Activity className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {analytics?.bandwidth_used || '1.2 TB'}
            </div>
            <div className="text-sm text-green-600 flex items-center gap-1">
              <span>↑ 15.3%</span>
              <span className="text-gray-500">vs last period</span>
            </div>
          </div>
        </div>

        {/* Viewer Trend Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Concurrent Viewers</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={viewerData}>
              <defs>
                <linearGradient id="colorViewers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="time" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip />
              <Area type="monotone" dataKey="viewers" stroke="#3B82F6" fillOpacity={1} fill="url(#colorViewers)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bandwidth Usage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Bandwidth Usage (GB)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bandwidthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip />
                <Bar dataKey="bandwidth" fill="#10B981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Stream Quality Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={streamQualityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {streamQualityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chat Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Chat Activity</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chatActivityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="hour" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip />
              <Line type="monotone" dataKey="messages" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Streams Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Top Performing Streams</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Stream Title</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Peak Viewers</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Duration</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Chat Messages</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { title: 'Product Launch Live', viewers: 2847, duration: '2h 15m', messages: 5420, date: '2024-12-08' },
                  { title: 'Weekly Q&A Session', viewers: 1523, duration: '1h 30m', messages: 3201, date: '2024-12-07' },
                  { title: 'Gaming Tournament Finals', viewers: 4102, duration: '3h 45m', messages: 8935, date: '2024-12-06' },
                  { title: 'Coding Workshop', viewers: 892, duration: '2h 00m', messages: 1456, date: '2024-12-05' },
                  { title: 'Music Concert', viewers: 3215, duration: '2h 30m', messages: 6782, date: '2024-12-04' }
                ].map((stream, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{stream.title}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{stream.viewers.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{stream.duration}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{stream.messages.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{stream.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;