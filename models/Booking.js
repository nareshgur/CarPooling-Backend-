const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
  passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  requestedAt: { type: Date, default: Date.now },
  approvedAt: { type: Date },
},{timestamps:true});

bookingSchema.index({ passengerId: 1, rideId: 1, status: 1 });
bookingSchema.index({ driverId: 1, status: 1, requestedAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
