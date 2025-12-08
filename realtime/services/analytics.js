/**
 * Analytics service for tracking metrics
 */
class AnalyticsService {
  constructor(io, db, redis) {
    this.io = io;
    this.db = db;
    this.redis = redis;
    
    // Start periodic updates
    this.startPeriodicUpdates();
  }

  /**
   * Start periodic metric updates
   */
  startPeriodicUpdates() {
    // Update viewer counts every 5 seconds
    setInterval(() => {
      this.updateViewerCounts();
    }, 5000);

    // Update connection stats every 10 seconds
    setInterval(() => {
      this.updateConnectionStats();
    }, 10000);
  }

  /**
   * Update viewer counts for all active streams
   */
  async updateViewerCounts() {
    try {
      // Get all rooms starting with "stream:"
      const rooms = await this.io.of('/').adapter.rooms;
      
      for (const [roomName, sockets] of rooms) {
        // Only process stream rooms, not individual socket rooms
        if (roomName.startsWith('stream:') && !roomName.includes('events')) {
          const streamId = roomName.split(':')[1];
          const viewerCount = sockets.size;
          
          // Update Redis
          await this.redis.set(`stream:${streamId}:viewers`, viewerCount);
          
          // Broadcast to the stream's event room
          this.io.to(`stream:${streamId}:events`).emit('viewer:count', {
            streamId,
            count: viewerCount,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('[Analytics] Error updating viewer counts:', error);
    }
  }

  /**
   * Update overall connection statistics
   */
  async updateConnectionStats() {
    try {
      const sockets = await this.io.fetchSockets();
      const totalConnections = sockets.length;
      
      // Store in Redis
      await this.redis.set('realtime:connections:total', totalConnections);
      
      // Get unique users
      const uniqueUsers = new Set(sockets.map(s => s.userId)).size;
      await this.redis.set('realtime:connections:unique_users', uniqueUsers);
      
      console.log(`[Analytics] Active connections: ${totalConnections}, Unique users: ${uniqueUsers}`);
    } catch (error) {
      console.error('[Analytics] Error updating connection stats:', error);
    }
  }

  /**
   * Track message rate for a room
   */
  async trackMessageRate(roomId) {
    try {
      const key = `analytics:messages:${roomId}:${Date.now()}`;
      await this.redis.incr(key);
      await this.redis.expire(key, 300); // Keep for 5 minutes
    } catch (error) {
      console.error('[Analytics] Error tracking message rate:', error);
    }
  }

  /**
   * Get analytics data for a stream
   */
  async getStreamAnalytics(streamId) {
    try {
      const viewerCount = await this.redis.get(`stream:${streamId}:viewers`) || 0;
      const peakViewers = await this.redis.get(`stream:${streamId}:peak_viewers`) || 0;
      
      // Get message count from database
      const messageCount = await this.db.collection('messages').countDocuments({
        streamId,
        deleted: false
      });

      return {
        streamId,
        currentViewers: parseInt(viewerCount),
        peakViewers: parseInt(peakViewers),
        totalMessages: messageCount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[Analytics] Error getting stream analytics:', error);
      return null;
    }
  }

  /**
   * Update peak viewer count
   */
  async updatePeakViewers(streamId, currentCount) {
    try {
      const peakKey = `stream:${streamId}:peak_viewers`;
      const currentPeak = parseInt(await this.redis.get(peakKey) || 0);
      
      if (currentCount > currentPeak) {
        await this.redis.set(peakKey, currentCount);
        console.log(`[Analytics] New peak viewers for stream ${streamId}: ${currentCount}`);
      }
    } catch (error) {
      console.error('[Analytics] Error updating peak viewers:', error);
    }
  }

  /**
   * Log event for analytics
   */
  async logEvent(eventType, data) {
    try {
      const event = {
        eventType,
        data,
        timestamp: new Date()
      };
      
      await this.db.collection('analytics_events').insertOne(event);
    } catch (error) {
      console.error('[Analytics] Error logging event:', error);
    }
  }

  /**
   * Get real-time metrics
   */
  async getRealtimeMetrics() {
    try {
      const totalConnections = await this.redis.get('realtime:connections:total') || 0;
      const uniqueUsers = await this.redis.get('realtime:connections:unique_users') || 0;
      
      // Get active streams
      const keys = await this.redis.keys('stream:*:viewers');
      const activeStreams = keys.length;
      
      return {
        totalConnections: parseInt(totalConnections),
        uniqueUsers: parseInt(uniqueUsers),
        activeStreams,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[Analytics] Error getting realtime metrics:', error);
      return null;
    }
  }
}

module.exports = AnalyticsService;
