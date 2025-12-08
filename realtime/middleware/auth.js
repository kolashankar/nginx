const jwt = require('jsonwebtoken');

/**
 * Socket.IO authentication middleware
 * Validates JWT token from handshake auth
 */
function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user data to socket
    socket.userId = decoded.user_id;
    socket.userEmail = decoded.email;
    
    console.log(`[Auth] User ${socket.userEmail} authenticated`);
    next();
  } catch (error) {
    console.error('[Auth] Authentication failed:', error.message);
    next(new Error('Invalid authentication token'));
  }
}

/**
 * Verify API key for server-to-server communication
 */
function authenticateApiKey(socket, next) {
  try {
    const apiKey = socket.handshake.auth.apiKey;
    
    if (!apiKey) {
      return next(new Error('API key required'));
    }

    // TODO: Validate API key against database
    // For now, just attach it to socket
    socket.apiKey = apiKey;
    socket.isServerClient = true;
    
    console.log(`[Auth] Server client authenticated with API key`);
    next();
  } catch (error) {
    console.error('[Auth] API key authentication failed:', error.message);
    next(new Error('Invalid API key'));
  }
}

module.exports = {
  authenticateSocket,
  authenticateApiKey
};
