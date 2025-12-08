const { ObjectId } = require('mongodb');

/**
 * Chat handler for real-time messaging
 */
class ChatHandler {
  constructor(io, db, redis) {
    this.io = io;
    this.db = db;
    this.redis = redis;
  }

  /**
   * Initialize chat handlers for a socket
   */
  initialize(socket) {
    // Join a chat room (stream/channel)
    socket.on('chat:join', async (data) => {
      await this.handleJoinRoom(socket, data);
    });

    // Leave a chat room
    socket.on('chat:leave', async (data) => {
      await this.handleLeaveRoom(socket, data);
    });

    // Send a message
    socket.on('chat:message', async (data) => {
      await this.handleMessage(socket, data);
    });

    // Request message history
    socket.on('chat:history', async (data) => {
      await this.handleHistory(socket, data);
    });

    // Typing indicator
    socket.on('chat:typing', async (data) => {
      await this.handleTyping(socket, data);
    });
  }

  /**
   * Handle joining a chat room
   */
  async handleJoinRoom(socket, data) {
    try {
      const { roomId, streamId } = data;
      
      if (!roomId) {
        socket.emit('chat:error', { message: 'Room ID required' });
        return;
      }

      // Join the Socket.IO room
      socket.join(roomId);
      
      // Track user in room
      await this.redis.sAdd(`room:${roomId}:users`, socket.userId);
      
      // Get current user count
      const userCount = await this.redis.sCard(`room:${roomId}:users`);
      
      // Notify room
      this.io.to(roomId).emit('chat:user_joined', {
        userId: socket.userId,
        userEmail: socket.userEmail,
        userCount: userCount,
        timestamp: new Date().toISOString()
      });

      // Send success to user
      socket.emit('chat:joined', {
        roomId,
        userCount,
        message: 'Successfully joined chat'
      });

      console.log(`[Chat] User ${socket.userEmail} joined room ${roomId}`);
    } catch (error) {
      console.error('[Chat] Error joining room:', error);
      socket.emit('chat:error', { message: 'Failed to join room' });
    }
  }

  /**
   * Handle leaving a chat room
   */
  async handleLeaveRoom(socket, data) {
    try {
      const { roomId } = data;
      
      if (!roomId) {
        return;
      }

      // Leave the Socket.IO room
      socket.leave(roomId);
      
      // Remove user from room tracking
      await this.redis.sRem(`room:${roomId}:users`, socket.userId);
      
      // Get updated user count
      const userCount = await this.redis.sCard(`room:${roomId}:users`);
      
      // Notify room
      this.io.to(roomId).emit('chat:user_left', {
        userId: socket.userId,
        userEmail: socket.userEmail,
        userCount: userCount,
        timestamp: new Date().toISOString()
      });

      console.log(`[Chat] User ${socket.userEmail} left room ${roomId}`);
    } catch (error) {
      console.error('[Chat] Error leaving room:', error);
    }
  }

  /**
   * Handle sending a message
   */
  async handleMessage(socket, data) {
    try {
      const { roomId, message, streamId } = data;
      
      if (!roomId || !message) {
        socket.emit('chat:error', { message: 'Room ID and message required' });
        return;
      }

      // Check if user is muted
      const isMuted = await this.redis.get(`mute:${roomId}:${socket.userId}`);
      if (isMuted) {
        socket.emit('chat:error', { message: 'You are muted in this room' });
        return;
      }

      // Create message object
      const messageObj = {
        id: new ObjectId().toString(),
        roomId,
        streamId,
        userId: socket.userId,
        userEmail: socket.userEmail,
        message: message.trim(),
        timestamp: new Date(),
        deleted: false
      };

      // Save to database
      await this.db.collection('messages').insertOne(messageObj);

      // Broadcast to room
      this.io.to(roomId).emit('chat:message', {
        id: messageObj.id,
        roomId: messageObj.roomId,
        userId: messageObj.userId,
        userEmail: messageObj.userEmail,
        message: messageObj.message,
        timestamp: messageObj.timestamp.toISOString()
      });

      console.log(`[Chat] Message from ${socket.userEmail} in room ${roomId}`);
    } catch (error) {
      console.error('[Chat] Error sending message:', error);
      socket.emit('chat:error', { message: 'Failed to send message' });
    }
  }

  /**
   * Handle requesting message history
   */
  async handleHistory(socket, data) {
    try {
      const { roomId, limit = 50, before } = data;
      
      if (!roomId) {
        socket.emit('chat:error', { message: 'Room ID required' });
        return;
      }

      // Build query
      const query = { roomId, deleted: false };
      if (before) {
        query.timestamp = { $lt: new Date(before) };
      }

      // Fetch messages
      const messages = await this.db.collection('messages')
        .find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      // Send to user
      socket.emit('chat:history', {
        roomId,
        messages: messages.map(msg => ({
          id: msg.id,
          roomId: msg.roomId,
          userId: msg.userId,
          userEmail: msg.userEmail,
          message: msg.message,
          timestamp: msg.timestamp.toISOString()
        })).reverse()
      });

      console.log(`[Chat] Sent ${messages.length} messages to ${socket.userEmail}`);
    } catch (error) {
      console.error('[Chat] Error fetching history:', error);
      socket.emit('chat:error', { message: 'Failed to fetch message history' });
    }
  }

  /**
   * Handle typing indicator
   */
  async handleTyping(socket, data) {
    try {
      const { roomId, isTyping } = data;
      
      if (!roomId) {
        return;
      }

      // Broadcast to room (except sender)
      socket.to(roomId).emit('chat:typing', {
        userId: socket.userId,
        userEmail: socket.userEmail,
        isTyping: isTyping === true
      });
    } catch (error) {
      console.error('[Chat] Error handling typing:', error);
    }
  }
}

module.exports = ChatHandler;
