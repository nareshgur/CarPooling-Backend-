const socketIo = require("socket.io");

class SocketService {
  constructor(server) {
    this.io = socketIo(server, {
      cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
      },
    });

    // Map userId -> Set of socketIds
    this.userSockets = new Map();
    // Map socketId -> userId
    this.socketUsers = new Map();

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log("User connected:", socket.id);

      socket.on("authenticate", ({ userId }) => {
        if (!userId) return;

        console.log("The userId is authenticated here !...",userId)
        // Map socket <-> user
        this.socketUsers.set(socket.id, userId);

        if (!this.userSockets.has(userId)) {
          this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId).add(socket.id);

        socket.join(`user_${userId}`);
        console.log(`✅ User ${userId} authenticated on socket ${socket.id}`);
      });

      socket.on("join-ride", (rideId) => {
        socket.join(`ride_${rideId}`);
        console.log(`Socket ${socket.id} joined ride ${rideId}`);
      });

      socket.on("disconnect", () => {
        const userId = this.socketUsers.get(socket.id);
        console.log(`🔌 Disconnect: socket ${socket.id}, user ${userId}`);
        
        if (userId) {
          const sockets = this.userSockets.get(userId);
          if (sockets) {
            console.log(`Before removal: ${sockets.size} sockets for user ${userId}`);
            sockets.delete(socket.id);
            console.log(`After removal: ${sockets.size} sockets for user ${userId}`);
            
            if (sockets.size === 0) {
              this.userSockets.delete(userId);
              console.log(`🧹 Removed empty user entry for ${userId}`);
            }
          }
          this.socketUsers.delete(socket.id);
          console.log(`✅ Cleaned up socket ${socket.id}`);
        }
        
        console.log(`Current users: ${Array.from(this.userSockets.keys())}`);
      });
    });
  }

  // Send notification to ALL sockets of a user
  // In SocketService.js - enhance sendToUser method
  sendToUser(userId, event, data) {
    console.log(`🔔 Attempting to send ${event} to user ${userId}`);
    console.log(`🔔 Event data:`, data);

    // Check if the user is registered in our userSockets map.
    // This helps in logging and understanding if the user is "known".
    const isUserRegistered = this.userSockets.has(userId);

    if (!isUserRegistered) {
      console.log(`⚠️ User ${userId} not registered in userSockets map at the moment of send attempt.`);
      console.log(`Current known users in map: ${Array.from(this.userSockets.keys())}`);
      // We don't return here because the user might be in the process of authenticating
      // and will join their room very soon. Emitting to the room is the most reliable way.
    } else {
      // If the user is registered, also check if they have active sockets
      const socketsForUser = this.userSockets.get(userId);
      if (socketsForUser.size === 0) {
        console.log(`⚠️ User ${userId} is registered, but has no active sockets in the map.`);
        console.log(`Current known users in map: ${Array.from(this.userSockets.keys())}`);
      } else {
        console.log(`Found ${socketsForUser.size} active socket(s) for user ${userId} in map.`);
      }
    }

    // Always attempt to emit to the user's dedicated room.
    // Socket.IO handles if the room is empty (no one is connected to it).
    console.log(`📤 Emitting ${event} to room user_${userId}`);
    this.io.to(`user_${userId}`).emit(event, data);

    console.log(`✅ Notification emission attempt completed for room user_${userId} for user ${userId}`);
  }

  // sendToRide(rideId, event, data) {
  //   this.io.to(`ride_${rideId}`)
  // }
}

module.exports = SocketService;