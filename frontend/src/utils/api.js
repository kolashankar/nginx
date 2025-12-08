import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getCurrentUser: () => api.get('/auth/me')
};

// Apps APIs
export const appsAPI = {
  create: (data) => api.post('/apps', data),
  list: () => api.get('/apps'),
  get: (appId) => api.get(`/apps/${appId}`),
  update: (appId, data) => api.put(`/apps/${appId}`, data),
  delete: (appId) => api.delete(`/apps/${appId}`)
};

// API Keys APIs
export const apiKeysAPI = {
  generate: (appId) => api.post(`/apps/${appId}/api-keys`),
  list: (appId) => api.get(`/apps/${appId}/api-keys`),
  delete: (appId, keyId) => api.delete(`/apps/${appId}/api-keys/${keyId}`),
  regenerate: (appId, keyId) => api.post(`/apps/${appId}/api-keys/${keyId}/regenerate`)
};

// Streams APIs
export const streamsAPI = {
  create: (appId, data) => api.post(`/apps/${appId}/streams`, data),
  list: (appId) => api.get(`/apps/${appId}/streams`),
  get: (appId, streamId) => api.get(`/apps/${appId}/streams/${streamId}`),
  update: (appId, streamId, data) => api.put(`/apps/${appId}/streams/${streamId}`, data),
  delete: (appId, streamId) => api.delete(`/apps/${appId}/streams/${streamId}`),
  getPlaybackToken: (appId, streamId) => api.get(`/apps/${appId}/streams/${streamId}/playback-token`)
};

// Webhooks APIs
export const webhooksAPI = {
  create: (appId, data) => api.post(`/apps/${appId}/webhooks`, data),
  list: (appId) => api.get(`/apps/${appId}/webhooks`),
  get: (appId, webhookId) => api.get(`/apps/${appId}/webhooks/${webhookId}`),
  update: (appId, webhookId, data) => api.put(`/apps/${appId}/webhooks/${webhookId}`, data),
  delete: (appId, webhookId) => api.delete(`/apps/${appId}/webhooks/${webhookId}`)
};

export default api;
