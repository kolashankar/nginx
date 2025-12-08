require('dotenv').config();
const { Server } = require('socket.io');
const { MongoClient } = require('mongodb');
const { createClient } = require('redis');
const http = require('http');

// Import handlers
const { authenticateSocket } = require('./middleware/auth');
const ChatHandler = require('./handlers/chat');
const ModerationHandler = require('./handlers/moderation');
const EventsHandler = require('./handlers/events');
const AnalyticsService = require('./services/analytics');

// Configuration
const PORT = process.env.PORT || 8002;
const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME;
const REDIS_URL = process.env.REDIS_URL;
const CORS_ORIGINS = process.env.CORS_ORIGINS?.split(',') || ['*'];

// Create HTTP server
const server = http.createServer();

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Global variables
let db;
let redis;
let chatHandler;
let moderationHandler;
let eventsHandler;
let analyticsService;

/**
 * Initialize connections
 */
async function initialize() {
  try {
    console.log('[Server] Initializing RealCast Real-Time Engine...');

    // Connect to MongoDB
    const mongoClient = new MongoClient(MONGO_URL);
    await mongoClient.connect();
    db = mongoClient.db(DB_NAME);
    console.log('[Server] Connected to MongoDB');

    // Connect to Redis
    redis = createClient({ url: REDIS_URL });
    redis.on('error', (err) => console.error('[Redis] Error:', err));
    await redis.connect();
    console.log('[Server] Connected to Redis');

    // Initialize handlers
    chatHandler = new ChatHandler(io, db, redis);
    moderationHandler = new ModerationHandler(io, db, redis);
    eventsHandler = new EventsHandler(io, db, redis);
    analyticsService = new AnalyticsService(io, db, redis);
    console.log('[Server] Handlers initialized');

    // Setup Socket.IO middleware and event handlers
    setupSocketIO();

    // Start server
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] RealCast Real-Time Engine running on port ${PORT}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV}`);
    });

  } catch (error) {
    console.error('[Server] Initialization error:', error);
    process.exit(1);
  }
}

/**
 * Setup Socket.IO middleware and handlers
 */
function setupSocketIO() {
  // Authentication middleware
  io.use(authenticateSocket);

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`[Server] Client connected: ${socket.id} (User: ${socket.userEmail})`);

    // Initialize all handlers for this socket
    chatHandler.initialize(socket);
    moderationHandler.initialize(socket);
    eventsHandler.initialize(socket);

    // Track connection
    analyticsService.logEvent('connection', {
      socketId: socket.id,
      userId: socket.userId,
      userEmail: socket.userEmail
    });

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      console.log(`[Server] Client disconnected: ${socket.id} (Reason: ${reason})`);
      
      // Clean up user from all rooms
      const rooms = Array.from(socket.rooms);
      for (const room of rooms) {
        if (room !== socket.id && room.startsWith('stream:')) {
          await redis.sRem(`room:${room}:users`, socket.userId);
        }
      }

      // Track disconnection
      analyticsService.logEvent('disconnection', {
        socketId: socket.id,
        userId: socket.userId,
        reason
      });
    });

    // Ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Get analytics
    socket.on('analytics:get', async (data) => {
      try {
        if (data.streamId) {
          const analytics = await analyticsService.getStreamAnalytics(data.streamId);
          socket.emit('analytics:data', analytics);
        } else {
          const metrics = await analyticsService.getRealtimeMetrics();
          socket.emit('analytics:metrics', metrics);
        }
      } catch (error) {
        console.error('[Server] Error getting analytics:', error);
        socket.emit('analytics:error', { message: 'Failed to get analytics' });
      }
    });
  });

  console.log('[Server] Socket.IO configured');
}

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, shutting down gracefully...');
  
  try {
    // Close Socket.IO
    io.close(() => {
      console.log('[Server] Socket.IO server closed');
    });

    // Close Redis
    await redis.quit();
    console.log('[Server] Redis connection closed');

    // Close MongoDB
    // Note: MongoClient is not stored, so we can't close it here
    
    process.exit(0);
  } catch (error) {
    console.error('[Server] Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('[Server] SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[Server] Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
initialize();
