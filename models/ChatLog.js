const mongoose = require("mongoose");

const ChatLogSchema = new mongoose.Schema({
  rideId: { type: mongoose.Schema.Types.ObjectId, ref: "Ride" },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  initiatedAt: { type: Date, default: Date.now },
});

// Compile schema into model
module.exports = mongoose.model("ChatLog", ChatLogSchema);
