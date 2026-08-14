import { WebSocketServer } from 'ws';
import { logger } from '@hire1percent/shared';

const log = logger.createLogger('websocket-server');

// Map of userId -> Set of active WebSocket connections
const connections = new Map();

/**
   * Helper to parse JWT payload without verifying signature (for extraction in routing/testing).
   */
function decodeJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Initializes the WebSocket server on top of the Express HTTP server.
 * 
 * @param {import('http').Server} httpServer 
 */
export function initializeWebSocket(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    // Standard upgrade protocol
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws, request) => {
    const url = new URL(request.url, 'http://localhost');
    let userId = url.searchParams.get('userId') || url.searchParams.get('token');

    // If it looks like a JWT token, decode it to get the userId
    if (userId && userId.includes('.')) {
      const decoded = decodeJwt(userId);
      if (decoded) {
        userId = decoded.userId || decoded.id || decoded.sub || userId;
      }
    }

    if (!userId) {
      log.warn('WebSocket connection attempt rejected: No user identity found.');
      ws.close(4001, 'Unauthorized: Missing user identity');
      return;
    }

    log.info(`WebSocket connected for user: ${userId}`);

    if (!connections.has(userId)) {
      connections.set(userId, new Set());
    }
    connections.get(userId).add(ws);

    ws.on('close', () => {
      log.info(`WebSocket closed for user: ${userId}`);
      const userSockets = connections.get(userId);
      if (userSockets) {
        userSockets.delete(ws);
        if (userSockets.size === 0) {
          connections.delete(userId);
        }
      }
    });

    ws.on('error', (err) => {
      log.error(`WebSocket error for user ${userId}:`, err);
    });

    // Send a welcome message
    ws.send(JSON.stringify({ type: 'connection_established', userId }));
  });

  return wss;
}

/**
 * Sends an in-app notification to a specific user if they are online.
 * 
 * @param {string} userId 
 * @param {Object} notification 
 * @returns {boolean} True if the notification was sent to at least one active connection
 */
export function sendInAppNotification(userId, notification) {
  const userSockets = connections.get(userId);
  if (!userSockets || userSockets.size === 0) {
    log.debug(`User ${userId} is offline. In-app notification saved to history but not pushed.`);
    return false;
  }

  log.info(`Pushing real-time in-app notification to user ${userId} across ${userSockets.size} tabs.`);
  let sentCount = 0;

  for (const ws of userSockets) {
    if (ws.readyState === 1) { // OPEN state
      try {
        ws.send(JSON.stringify({
          type: 'notification',
          data: notification,
        }));
        sentCount++;
      } catch (err) {
        log.error(`Failed to push to a socket for user ${userId}:`, err);
      }
    }
  }

  return sentCount > 0;
}

export default {
  initializeWebSocket,
  sendInAppNotification,
};
