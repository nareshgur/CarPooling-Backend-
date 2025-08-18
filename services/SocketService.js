const socketIo = require('socket.io');

class SocketService {
  constructor(server) {
    this.io = socketIo(server, {
      cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
      }
    });
    
    this.userSockets = new Map(); // userId -> socketId
    this.socketUsers = new Map(); // socketId -> userId
    
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // Authenticate user and store mapping
      socket.on('authenticate', (data) => {
        const { userId, token } = data;
        // In production, verify JWT token here
        
        this.userSockets.set(userId, socket.id);
        this.socketUsers.set(socket.id, userId);
        
        socket.join(`user_${userId}`);
        console.log(`User ${userId} authenticated on socket ${socket.id}`);
      });

      // Join ride-specific room
      socket.on('join-ride', (rideId) => {
        socket.join(`ride_${rideId}`);
        console.log(`Socket ${socket.id} joined ride ${rideId}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        const userId = this.socketUsers.get(socket.id);
        if (userId) {
          this.userSockets.delete(userId);
          this.socketUsers.delete(socket.id);
          console.log(`User ${userId} disconnected from socket ${socket.id}`);
        }
      });
    });
  }

  // Send notification to specific user
  sendToUser(userId, event, data) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  // Send message to ride participants
  sendToRide(rideId, event, data) {
    this.io.to(`ride_${rideId}`).emit(event, data);
  }

  // Broadcast to all connected clients
  broadcast(event, data) {
    this.io.emit(event, data);
  }
}

module.exports = SocketService;
