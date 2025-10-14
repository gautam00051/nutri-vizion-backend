import ws from 'ws'
import { v4 as uuidv4 } from 'uuid'

const { WebSocket } = ws

class WebRTCSignalingServer {
  constructor() {
    this.rooms = new Map(); // roomId -> { clients: Map, createdAt: Date }
    this.clients = new Map(); // ws -> { userId, roomId, userType }
  }

  handleConnection(ws, roomId, userId) {
    console.log(`WebRTC: User ${userId} connecting to room ${roomId}`);
    
    // Initialize room if it doesn't exist
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        clients: new Map(),
        createdAt: new Date()
      });
    }

    const room = this.rooms.get(roomId);
    
    // Add client to room and global clients map
    room.clients.set(ws, { userId, joinedAt: new Date() });
    this.clients.set(ws, { userId, roomId });

    // Send welcome message
    this.sendToClient(ws, {
      type: 'connected',
      roomId,
      userId,
      message: 'Connected to signaling server'
    });

    // Notify other clients in the room about new user
    this.broadcastToRoom(roomId, {
      type: 'user-joined',
      userId,
      timestamp: new Date().toISOString()
    }, ws);

    // Set up message handler
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(ws, message);
      } catch (error) {
        console.error('WebRTC: Invalid message format:', error);
        this.sendToClient(ws, {
          type: 'error',
          message: 'Invalid message format'
        });
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      this.handleDisconnect(ws);
    });

    ws.on('error', (error) => {
      console.error('WebRTC: WebSocket error:', error);
      this.handleDisconnect(ws);
    });

    console.log(`WebRTC: Room ${roomId} now has ${room.clients.size} clients`);
  }

  handleMessage(ws, message) {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo) {
      console.error('WebRTC: Message from unknown client');
      return;
    }

    const { userId, roomId } = clientInfo;
    console.log(`WebRTC: Message from ${userId} in room ${roomId}:`, message.type);

    switch (message.type) {
      case 'offer':
      case 'answer':
      case 'ice-candidate':
        // Forward signaling messages to other clients in the room
        this.broadcastToRoom(roomId, {
          ...message,
          fromUserId: userId,
          timestamp: new Date().toISOString()
        }, ws);
        break;

      case 'user-left':
        this.handleUserLeft(ws);
        break;

      case 'ping':
        this.sendToClient(ws, { type: 'pong' });
        break;

      default:
        console.log('WebRTC: Unknown message type:', message.type);
        this.sendToClient(ws, {
          type: 'error',
          message: `Unknown message type: ${message.type}`
        });
    }
  }

  handleDisconnect(ws) {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo) return;

    const { userId, roomId } = clientInfo;
    console.log(`WebRTC: User ${userId} disconnecting from room ${roomId}`);

    // Remove from room
    const room = this.rooms.get(roomId);
    if (room) {
      room.clients.delete(ws);
      
      // Notify other clients
      this.broadcastToRoom(roomId, {
        type: 'user-left',
        userId,
        timestamp: new Date().toISOString()
      });

      // Clean up empty rooms
      if (room.clients.size === 0) {
        console.log(`WebRTC: Cleaning up empty room ${roomId}`);
        this.rooms.delete(roomId);
      } else {
        console.log(`WebRTC: Room ${roomId} now has ${room.clients.size} clients`);
      }
    }

    // Remove from global clients map
    this.clients.delete(ws);
  }

  handleUserLeft(ws) {
    this.handleDisconnect(ws);
    ws.close();
  }

  sendToClient(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('WebRTC: Error sending message to client:', error);
      }
    }
  }

  broadcastToRoom(roomId, message, excludeWs = null) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.clients.forEach((clientInfo, ws) => {
      if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
        this.sendToClient(ws, message);
      }
    });
  }

  // Get room statistics
  getRoomStats(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    return {
      roomId,
      clientCount: room.clients.size,
      createdAt: room.createdAt,
      clients: Array.from(room.clients.values()).map(client => ({
        userId: client.userId,
        joinedAt: client.joinedAt
      }))
    };
  }

  // Get all rooms statistics
  getAllRoomsStats() {
    const stats = [];
    this.rooms.forEach((room, roomId) => {
      stats.push(this.getRoomStats(roomId));
    });
    return stats;
  }

  // Clean up old empty rooms (can be called periodically)
  cleanupOldRooms(maxAgeHours = 24) {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    
    this.rooms.forEach((room, roomId) => {
      if (room.clients.size === 0 && room.createdAt < cutoffTime) {
        console.log(`WebRTC: Cleaning up old empty room ${roomId}`);
        this.rooms.delete(roomId);
      }
    });
  }
}

export default WebRTCSignalingServer