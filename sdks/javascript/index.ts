/**
 * RealCast JavaScript/TypeScript SDK
 * 
 * Official SDK for integrating RealCast PaaS into your applications
 */

import axios, { AxiosInstance } from 'axios';
import { io, Socket } from 'socket.io-client';

// Types
export interface RealCastConfig {
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends AuthCredentials {
  fullName: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  user: User;
}

export interface App {
  id: string;
  name: string;
  description?: string;
  userId: string;
  settings?: Record<string, any>;
  createdAt: string;
}

export interface Stream {
  id: string;
  appId: string;
  title: string;
  description?: string;
  streamKey: string;
  rtmpUrl: string;
  hlsUrl: string;
  status: string;
  createdAt: string;
}

export interface StreamStatus {
  streamId: string;
  status: string;
  viewerCount: number;
  startedAt?: string;
  durationSeconds?: number;
}

export interface ApiKey {
  id: string;
  appId: string;
  name: string;
  apiKey: string;
  apiSecret?: string;
  scopes: string[];
  createdAt: string;
}

export interface Webhook {
  id: string;
  appId: string;
  url: string;
  events: string[];
  status: string;
  createdAt: string;
}

export interface Recording {
  id: string;
  streamId: string;
  appId: string;
  title?: string;
  status: string;
  cdnUrl?: string;
  duration?: number;
  fileSize?: number;
  createdAt: string;
}

/**
 * Main API Client
 */
export class RealCastAPI {
  private client: AxiosInstance;
  
  constructor(config: RealCastConfig = {}) {
    const baseURL = config.baseUrl || 'https://api.realcast.io/api';
    
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (config.apiKey && config.apiSecret) {
      this.client.defaults.headers.common['X-API-Key'] = config.apiKey;
      this.client.defaults.headers.common['X-API-Secret'] = config.apiSecret;
    }
  }
  
  // Auth
  auth = {
    register: async (data: RegisterData): Promise<User> => {
      const response = await this.client.post('/auth/register', {
        email: data.email,
        password: data.password,
        full_name: data.fullName
      });
      return response.data;
    },
    
    login: async (credentials: AuthCredentials): Promise<LoginResponse> => {
      const response = await this.client.post('/auth/login', credentials);
      return response.data;
    },
    
    getCurrentUser: async (token: string): Promise<User> => {
      const response = await this.client.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    }
  };
  
  // Apps
  apps = {
    create: async (data: Partial<App>, token: string): Promise<App> => {
      const response = await this.client.post('/apps', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    
    list: async (token: string): Promise<App[]> => {
      const response = await this.client.get('/apps', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    
    get: async (appId: string, token: string): Promise<App> => {
      const response = await this.client.get(`/apps/${appId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    
    update: async (appId: string, data: Partial<App>, token: string): Promise<App> => {
      const response = await this.client.put(`/apps/${appId}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    
    delete: async (appId: string, token: string): Promise<void> => {
      await this.client.delete(`/apps/${appId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  };
  
  // Streams
  streams = {
    create: async (data: Partial<Stream>, token: string): Promise<Stream> => {
      const response = await this.client.post('/streams', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    
    list: async (params: any, token: string): Promise<Stream[]> => {
      const response = await this.client.get('/streams', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    
    get: async (streamId: string, token: string): Promise<Stream> => {
      const response = await this.client.get(`/streams/${streamId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    
    getStatus: async (streamId: string, token: string): Promise<StreamStatus> => {
      const response = await this.client.get(`/streams/${streamId}/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    
    generatePlaybackToken: async (
      streamId: string,
      data: { viewerId: string; expiryMinutes: number },
      token: string
    ): Promise<any> => {
      const response = await this.client.post(
        `/streams/${streamId}/playback-token`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    
    update: async (streamId: string, data: Partial<Stream>, token: string): Promise<Stream> => {
      const response = await this.client.put(`/streams/${streamId}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    
    delete: async (streamId: string, token: string): Promise<void> => {
      await this.client.delete(`/streams/${streamId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  };
  
  // API Keys
  apiKeys = {
    create: async (data: Partial<ApiKey>, token: string): Promise<ApiKey> => {
      const response = await this.client.post('/api-keys', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    
    list: async (params: any, token: string): Promise<ApiKey[]> => {
      const response = await this.client.get('/api-keys', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    
    regenerate: async (keyId: string, token: string): Promise<ApiKey> => {
      const response = await this.client.post(
        `/api-keys/${keyId}/regenerate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    
    delete: async (keyId: string, token: string): Promise<void> => {
      await this.client.delete(`/api-keys/${keyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  };
  
  // Webhooks
  webhooks = {
    create: async (data: Partial<Webhook>, token: string): Promise<Webhook> => {
      const response = await this.client.post('/webhooks', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    
    list: async (params: any, token: string): Promise<Webhook[]> => {
      const response = await this.client.get('/webhooks', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    
    update: async (webhookId: string, data: Partial<Webhook>, token: string): Promise<Webhook> => {
      const response = await this.client.put(`/webhooks/${webhookId}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    
    delete: async (webhookId: string, token: string): Promise<void> => {
      await this.client.delete(`/webhooks/${webhookId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  };
  
  // Recordings
  recordings = {
    start: async (data: any, token: string): Promise<Recording> => {
      const response = await this.client.post('/recordings/start', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    
    stop: async (streamId: string, token: string): Promise<Recording> => {
      const response = await this.client.post(
        `/recordings/stop/${streamId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    
    list: async (params: any, token: string): Promise<Recording[]> => {
      const response = await this.client.get('/recordings', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    
    get: async (recordingId: string, token: string): Promise<Recording> => {
      const response = await this.client.get(`/recordings/${recordingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    
    delete: async (recordingId: string, token: string): Promise<void> => {
      await this.client.delete(`/recordings/${recordingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  };
}

/**
 * Real-Time Chat Client
 */
export interface ChatConfig {
  streamId: string;
  userId: string;
  username: string;
  token: string;
  serverUrl?: string;
}

export class RealCastChat {
  private socket: Socket;
  private config: ChatConfig;
  
  constructor(config: ChatConfig) {
    this.config = config;
    const serverUrl = config.serverUrl || 'wss://realtime.realcast.io';
    
    this.socket = io(serverUrl, {
      auth: {
        token: config.token,
        app_id: 'app_id' // Should be provided in config
      },
      transports: ['websocket']
    });
    
    this.setupDefaultListeners();
  }
  
  private setupDefaultListeners() {
    this.socket.on('connect', () => {
      this.socket.emit('chat:join', {
        stream_id: this.config.streamId,
        user_id: this.config.userId,
        username: this.config.username
      });
    });
  }
  
  sendMessage(message: string) {
    this.socket.emit('chat:message', {
      stream_id: this.config.streamId,
      user_id: this.config.userId,
      username: this.config.username,
      message
    });
  }
  
  sendReaction(emoji: string) {
    this.socket.emit('reaction:send', {
      stream_id: this.config.streamId,
      user_id: this.config.userId,
      emoji
    });
  }
  
  on(event: string, callback: (data: any) => void) {
    this.socket.on(event, callback);
  }
  
  disconnect() {
    this.socket.emit('chat:leave', {
      stream_id: this.config.streamId,
      user_id: this.config.userId
    });
    this.socket.disconnect();
  }
}

export default RealCastAPI;
