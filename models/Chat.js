const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  messageType: { type: String, enum: ['text', 'image', 'file'], default: 'text' },
  timestamp: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false }
});

const chatSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  messages: [messageSchema],
  lastMessage: { type: Date, default: Date.now },
  rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride' },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }
}, { timestamps: true });

chatSchema.index({ rideId: 1, participants: 1 });
chatSchema.index({ lastMessage: -1 });

module.exports = mongoose.model('Chat', chatSchema);
