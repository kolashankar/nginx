/**
 * Events handler for real-time stream and system events
 */
class EventsHandler {
  constructor(io, db, redis) {
    this.io = io;
    this.db = db;
    this.redis = redis;
  }

  /**
   * Initialize event handlers for a socket
   */
  initialize(socket) {
    // Subscribe to stream events
    socket.on('events:subscribe', async (data) => {
      await this.handleSubscribe(socket, data);
    });

    // Unsubscribe from events
    socket.on('events:unsubscribe', async (data) => {
      await this.handleUnsubscribe(socket, data);
    });

    // Send reaction
    socket.on('events:reaction', async (data) => {
      await this.handleReaction(socket, data);
    });
  }

  /**
   * Subscribe to stream events
   */
  async handleSubscribe(socket, data) {
    try {
      const { streamId, eventTypes } = data;
      
      if (!streamId) {
        socket.emit('events:error', { message: 'Stream ID required' });
        return;
      }

      // Join stream event room
      const roomName = `stream:${streamId}:events`;
      socket.join(roomName);
      
      console.log(`[Events] User ${socket.userEmail} subscribed to stream ${streamId} events`);
      
      socket.emit('events:subscribed', {
        streamId,
        eventTypes: eventTypes || 'all'
      });
    } catch (error) {
      console.error('[Events] Error subscribing:', error);
      socket.emit('events:error', { message: 'Failed to subscribe to events' });
    }
  }

  /**
   * Unsubscribe from stream events
   */
  async handleUnsubscribe(socket, data) {
    try {
      const { streamId } = data;
      
      if (!streamId) {
        return;
      }

      // Leave stream event room
      const roomName = `stream:${streamId}:events`;
      socket.leave(roomName);
      
      console.log(`[Events] User ${socket.userEmail} unsubscribed from stream ${streamId} events`);
    } catch (error) {
      console.error('[Events] Error unsubscribing:', error);
    }
  }

  /**
   * Handle reaction (like, heart, etc.)
   */
  async handleReaction(socket, data) {
    try {
      const { streamId, roomId, reaction } = data;
      
      if (!streamId || !reaction) {
        socket.emit('events:error', { message: 'Stream ID and reaction required' });
        return;
      }

      // Broadcast reaction to room
      const room = roomId || `stream:${streamId}`;
      this.io.to(room).emit('events:reaction', {
        userId: socket.userId,
        userEmail: socket.userEmail,
        reaction,
        timestamp: new Date().toISOString()
      });

      console.log(`[Events] Reaction ${reaction} from ${socket.userEmail} in stream ${streamId}`);
    } catch (error) {
      console.error('[Events] Error handling reaction:', error);
      socket.emit('events:error', { message: 'Failed to send reaction' });
    }
  }

  /**
   * Broadcast stream status change
   */
  async broadcastStreamStatus(streamId, status, metadata = {}) {
    try {
      const roomName = `stream:${streamId}:events`;
      
      this.io.to(roomName).emit('stream:status', {
        streamId,
        status, // 'live', 'offline', 'error'
        ...metadata,
        timestamp: new Date().toISOString()
      });

      console.log(`[Events] Broadcasted stream ${streamId} status: ${status}`);
    } catch (error) {
      console.error('[Events] Error broadcasting stream status:', error);
    }
  }

  /**
   * Broadcast viewer count update
   */
  async broadcastViewerCount(streamId, count) {
    try {
      const roomName = `stream:${streamId}:events`;
      
      this.io.to(roomName).emit('viewer:count', {
        streamId,
        count,
        timestamp: new Date().toISOString()
      });

      // Also update in Redis
      await this.redis.set(`stream:${streamId}:viewers`, count);
    } catch (error) {
      console.error('[Events] Error broadcasting viewer count:', error);
    }
  }

  /**
   * Broadcast quality change
   */
  async broadcastQualityChange(streamId, quality) {
    try {
      const roomName = `stream:${streamId}:events`;
      
      this.io.to(roomName).emit('stream:quality', {
        streamId,
        quality,
        timestamp: new Date().toISOString()
      });

      console.log(`[Events] Broadcasted stream ${streamId} quality: ${quality}`);
    } catch (error) {
      console.error('[Events] Error broadcasting quality change:', error);
    }
  }

  /**
   * Broadcast recording status
   */
  async broadcastRecordingStatus(streamId, status, recordingId) {
    try {
      const roomName = `stream:${streamId}:events`;
      
      this.io.to(roomName).emit('recording:status', {
        streamId,
        recordingId,
        status, // 'started', 'stopped', 'ready', 'error'
        timestamp: new Date().toISOString()
      });

      console.log(`[Events] Broadcasted recording ${recordingId} status: ${status}`);
    } catch (error) {
      console.error('[Events] Error broadcasting recording status:', error);
    }
  }
}

module.exports = EventsHandler;
