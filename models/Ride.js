const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    // Add route-specific information
    routeIndex: { type: Number, default: 0 }, // Position in the route
    estimatedTime: { type: Date }, // Estimated arrival time
  },
  { _id: false }
);

// Route segment for en-route matching
const routeSegmentSchema = new mongoose.Schema({
  startLocation: locationSchema,
  endLocation: locationSchema,
  distance: { type: Number }, // in meters
  duration: { type: Number }, // in seconds
  routePolyline: { type: String }, // Google/OSRM polyline
}, { _id: false });

const rideSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  origin: locationSchema,
  destination: locationSchema,
  stops: [locationSchema],

  // Enhanced route information
  routePolyline: { type: String }, // Full route polyline
  routeSegments: [routeSegmentSchema], // Route broken into segments
  totalDistance: { type: Number }, // Total route distance in meters
  estimatedDuration: { type: Number }, // Total duration in seconds
  
  // Route deviation settings
  maxDeviationDistance: { type: Number, default: 10000 }, // 10km default
  allowPickupDeviation: { type: Boolean, default: true },
  allowDropoffDeviation: { type: Boolean, default: true },

  dateTime: { type: Date, required: true },
  availableSeats: { type: Number, required: true },
  pricePerSeat: { type: Number, required: true },

  // Enhanced search metadata
  searchKeywords: [String], // For text-based search optimization
  routeBoundingBox: {
    type: {
      type: String,
      enum: ['Polygon'],
      default: 'Polygon'
    },
    coordinates: [[[Number]]] // Bounding box for quick filtering
  },

  vechile: { type: mongoose.Schema.Types.ObjectId, ref: "Vechile" },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Create comprehensive geospatial indexes
rideSchema.index({ "origin.location": "2dsphere" });
rideSchema.index({ "destination.location": "2dsphere" });
rideSchema.index({ "stops.location": "2dsphere" });
rideSchema.index({ "routeBoundingBox": "2dsphere" });
rideSchema.index({ "searchKeywords": "text" });
rideSchema.index({ "dateTime": 1 });
rideSchema.index({ "driverId": 1, "dateTime": -1 });

// Pre-save middleware to update search keywords and bounding box
rideSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Generate search keywords
  const keywords = [];
  if (this.origin?.name) keywords.push(this.origin.name.toLowerCase());
  if (this.destination?.name) keywords.push(this.destination.name.toLowerCase());
  if (this.stops) {
    this.stops.forEach(stop => {
      if (stop.name) keywords.push(stop.name.toLowerCase());
    });
  }
  this.searchKeywords = [...new Set(keywords)];
  
  // Calculate bounding box if coordinates are available
  if (this.origin?.location?.coordinates && this.destination?.location?.coordinates) {
    const coords = [this.origin.location.coordinates, this.destination.location.coordinates];
    if (this.stops) {
      this.stops.forEach(stop => {
        if (stop.location?.coordinates) coords.push(stop.location.coordinates);
      });
    }
    
    const lngs = coords.map(c => c[0]);
    const lats = coords.map(c => c[1]);
    
    this.routeBoundingBox = {
      type: 'Polygon',
      coordinates: [[
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
        [Math.min(...lngs), Math.max(...lats)],
        [Math.min(...lngs), Math.min(...lats)]
      ]]
    };
  }
  
  next();
});

module.exports = mongoose.model("Ride", rideSchema);
