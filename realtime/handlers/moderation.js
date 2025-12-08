/**
 * Moderation handler for chat management
 */
class ModerationHandler {
  constructor(io, db, redis) {
    this.io = io;
    this.db = db;
    this.redis = redis;
  }

  /**
   * Initialize moderation handlers for a socket
   */
  initialize(socket) {
    // Ban user from room
    socket.on('mod:ban', async (data) => {
      await this.handleBan(socket, data);
    });

    // Unban user
    socket.on('mod:unban', async (data) => {
      await this.handleUnban(socket, data);
    });

    // Mute user temporarily
    socket.on('mod:mute', async (data) => {
      await this.handleMute(socket, data);
    });

    // Unmute user
    socket.on('mod:unmute', async (data) => {
      await this.handleUnmute(socket, data);
    });

    // Delete message
    socket.on('mod:delete_message', async (data) => {
      await this.handleDeleteMessage(socket, data);
    });

    // Enable slow mode
    socket.on('mod:slow_mode', async (data) => {
      await this.handleSlowMode(socket, data);
    });
  }

  /**
   * Check if user is a moderator
   */
  async isModerator(socket, roomId) {
    // TODO: Check against database for moderator role
    // For now, return true for demonstration
    return true;
  }

  /**
   * Handle banning a user
   */
  async handleBan(socket, data) {
    try {
      const { roomId, userId, reason, duration } = data;
      
      if (!roomId || !userId) {
        socket.emit('mod:error', { message: 'Room ID and User ID required' });
        return;
      }

      // Check moderator permission
      if (!(await this.isModerator(socket, roomId))) {
        socket.emit('mod:error', { message: 'Insufficient permissions' });
        return;
      }

      // Store ban in Redis
      const banKey = `ban:${roomId}:${userId}`;
      if (duration) {
        await this.redis.setEx(banKey, duration, reason || 'Banned');
      } else {
        await this.redis.set(banKey, reason || 'Banned');
      }

      // Kick user from room
      const sockets = await this.io.in(roomId).fetchSockets();
      for (const s of sockets) {
        if (s.userId === userId) {
          s.emit('mod:banned', { roomId, reason, duration });
          s.leave(roomId);
        }
      }

      // Notify room
      this.io.to(roomId).emit('mod:user_banned', {
        userId,
        reason,
        duration,
        timestamp: new Date().toISOString()
      });

      console.log(`[Mod] User ${userId} banned from room ${roomId}`);
    } catch (error) {
      console.error('[Mod] Error banning user:', error);
      socket.emit('mod:error', { message: 'Failed to ban user' });
    }
  }

  /**
   * Handle unbanning a user
   */
  async handleUnban(socket, data) {
    try {
      const { roomId, userId } = data;
      
      if (!roomId || !userId) {
        socket.emit('mod:error', { message: 'Room ID and User ID required' });
        return;
      }

      // Check moderator permission
      if (!(await this.isModerator(socket, roomId))) {
        socket.emit('mod:error', { message: 'Insufficient permissions' });
        return;
      }

      // Remove ban from Redis
      await this.redis.del(`ban:${roomId}:${userId}`);

      // Notify room
      this.io.to(roomId).emit('mod:user_unbanned', {
        userId,
        timestamp: new Date().toISOString()
      });

      console.log(`[Mod] User ${userId} unbanned from room ${roomId}`);
    } catch (error) {
      console.error('[Mod] Error unbanning user:', error);
      socket.emit('mod:error', { message: 'Failed to unban user' });
    }
  }

  /**
   * Handle muting a user
   */
  async handleMute(socket, data) {
    try {
      const { roomId, userId, duration = 300 } = data; // Default 5 minutes
      
      if (!roomId || !userId) {
        socket.emit('mod:error', { message: 'Room ID and User ID required' });
        return;
      }

      // Check moderator permission
      if (!(await this.isModerator(socket, roomId))) {
        socket.emit('mod:error', { message: 'Insufficient permissions' });
        return;
      }

      // Store mute in Redis with expiration
      await this.redis.setEx(`mute:${roomId}:${userId}`, duration, 'muted');

      // Notify the muted user
      const sockets = await this.io.in(roomId).fetchSockets();
      for (const s of sockets) {
        if (s.userId === userId) {
          s.emit('mod:muted', { roomId, duration });
        }
      }

      // Notify room
      this.io.to(roomId).emit('mod:user_muted', {
        userId,
        duration,
        timestamp: new Date().toISOString()
      });

      console.log(`[Mod] User ${userId} muted in room ${roomId} for ${duration}s`);
    } catch (error) {
      console.error('[Mod] Error muting user:', error);
      socket.emit('mod:error', { message: 'Failed to mute user' });
    }
  }

  /**
   * Handle unmuting a user
   */
  async handleUnmute(socket, data) {
    try {
      const { roomId, userId } = data;
      
      if (!roomId || !userId) {
        socket.emit('mod:error', { message: 'Room ID and User ID required' });
        return;
      }

      // Check moderator permission
      if (!(await this.isModerator(socket, roomId))) {
        socket.emit('mod:error', { message: 'Insufficient permissions' });
        return;
      }

      // Remove mute from Redis
      await this.redis.del(`mute:${roomId}:${userId}`);

      // Notify the unmuted user
      const sockets = await this.io.in(roomId).fetchSockets();
      for (const s of sockets) {
        if (s.userId === userId) {
          s.emit('mod:unmuted', { roomId });
        }
      }

      // Notify room
      this.io.to(roomId).emit('mod:user_unmuted', {
        userId,
        timestamp: new Date().toISOString()
      });

      console.log(`[Mod] User ${userId} unmuted in room ${roomId}`);
    } catch (error) {
      console.error('[Mod] Error unmuting user:', error);
      socket.emit('mod:error', { message: 'Failed to unmute user' });
    }
  }

  /**
   * Handle deleting a message
   */
  async handleDeleteMessage(socket, data) {
    try {
      const { roomId, messageId } = data;
      
      if (!roomId || !messageId) {
        socket.emit('mod:error', { message: 'Room ID and Message ID required' });
        return;
      }

      // Check moderator permission
      if (!(await this.isModerator(socket, roomId))) {
        socket.emit('mod:error', { message: 'Insufficient permissions' });
        return;
      }

      // Mark message as deleted in database
      await this.db.collection('messages').updateOne(
        { id: messageId },
        { $set: { deleted: true, deletedAt: new Date() } }
      );

      // Notify room
      this.io.to(roomId).emit('mod:message_deleted', {
        messageId,
        timestamp: new Date().toISOString()
      });

      console.log(`[Mod] Message ${messageId} deleted from room ${roomId}`);
    } catch (error) {
      console.error('[Mod] Error deleting message:', error);
      socket.emit('mod:error', { message: 'Failed to delete message' });
    }
  }

  /**
   * Handle enabling slow mode
   */
  async handleSlowMode(socket, data) {
    try {
      const { roomId, enabled, interval = 5 } = data;
      
      if (!roomId) {
        socket.emit('mod:error', { message: 'Room ID required' });
        return;
      }

      // Check moderator permission
      if (!(await this.isModerator(socket, roomId))) {
        socket.emit('mod:error', { message: 'Insufficient permissions' });
        return;
      }

      // Store slow mode setting in Redis
      if (enabled) {
        await this.redis.set(`slowmode:${roomId}`, interval);
      } else {
        await this.redis.del(`slowmode:${roomId}`);
      }

      // Notify room
      this.io.to(roomId).emit('mod:slow_mode', {
        enabled,
        interval,
        timestamp: new Date().toISOString()
      });

      console.log(`[Mod] Slow mode ${enabled ? 'enabled' : 'disabled'} in room ${roomId}`);
    } catch (error) {
      console.error('[Mod] Error setting slow mode:', error);
      socket.emit('mod:error', { message: 'Failed to set slow mode' });
    }
  }
}

module.exports = ModerationHandler;
