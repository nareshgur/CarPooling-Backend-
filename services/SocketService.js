const socketIo = require("socket.io");

class SocketService {
  constructor(server) {
    this.io = socketIo(server, {
      cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
      },
    });

    this.userSockets = new Map();
    this.socketUsers = new Map();

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log("User connected:", socket.id);

      socket.on("authenticate", ({ userId }) => {
        if (!userId) return;

        console.log("The userId is authenticated here !...",userId)
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

  sendToUser(userId, event, data) {
    console.log(`🔔 Attempting to send ${event} to user ${userId}`);
    console.log(`🔔 Event data:`, data);

    const isUserRegistered = this.userSockets.has(userId);

    if (!isUserRegistered) {
      console.log(`⚠️ User ${userId} not registered in userSockets map at the moment of send attempt.`);
      console.log(`Current known users in map: ${Array.from(this.userSockets.keys())}`);
    } else {
      const socketsForUser = this.userSockets.get(userId);
      if (socketsForUser.size === 0) {
        console.log(`⚠️ User ${userId} is registered, but has no active sockets in the map.`);
        console.log(`Current known users in map: ${Array.from(this.userSockets.keys())}`);
      } else {
        console.log(`Found ${socketsForUser.size} active socket(s) for user ${userId} in map.`);
      }
    }

    console.log(`📤 Emitting ${event} to room user_${userId}`);
    this.io.to(`user_${userId}`).emit(event, data);

    console.log(`✅ Notification emission attempt completed for room user_${userId} for user ${userId}`);
  }

}

module.exports = SocketService;