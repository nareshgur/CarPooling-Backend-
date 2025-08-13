const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g., "Dichpally Bus Stand"
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
  },
  { _id: false }
);

const rideSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  origin: locationSchema,
  destination: locationSchema,

  stops: [locationSchema], // Now each stop has coordinates

  dateTime: { type: Date, required: true },
  availableSeats: { type: Number, required: true },
  pricePerSeat: { type: Number, required: true },

  vechile: { type: mongoose.Schema.Types.ObjectId, ref: "Vechile" },
});

// Create geospatial indexes
rideSchema.index({ "origin.location": "2dsphere" });
rideSchema.index({ "destination.location": "2dsphere" });
rideSchema.index({ "stops.location": "2dsphere" });

module.exports = mongoose.model("Ride", rideSchema);
