const Ride = require("../models/Ride");
const express = require("express");
const router = express.Router();
const RideService = require("../services/RideService");
const { error } = require("winston");
const { route } = require("./AuthController");
const auth = require("../middleware/auth");
const { validateSearchParams, getLocationSuggestions, validateLocationName } = require("../utils/locationValidator");

router.post("/Ride",auth, async (req, res) => {
  try {
    console.log("=== RIDE CREATION REQUEST ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    
    // Log origin details
    if (req.body.origin) {
      console.log("Origin name:", req.body.origin.name);
      console.log("Origin coordinates:", req.body.origin.location?.coordinates);
    }
    
    // Log destination details
    if (req.body.destination) {
      console.log("Destination name:", req.body.destination.name);
      console.log("Destination coordinates:", req.body.destination.location?.coordinates);
    }
    
    const ride = await RideService.createRide(
      req.user._id,
      req.body
    );
    res.status(201).send(ride);
  } catch (err) {
    console.log(`Error in Ride Creation `, err);
    return res.status(500).send(err.message);
  }
});

router.get("/", async (req, res) => {});

router.put("/:rideId", auth, async (req, res) => {
  try {
    const driverId = req.user._id;
    const rideId = req.params.rideId;

    const result = await RideService.updateRideAndVehicle(
      driverId,
      rideId,
      req.body
    );
    res.status(200).send(result);
  } catch (err) {
    console.error("Error updating ride and vehicle", err);
    res.status(500).send({ error: err.message });
  }
});

router.get("/my", auth, async (req, res) => {
  try {
    const driverId = req.user._id;
    const rides = await RideService.getRidesByDriver(driverId);
    res.status(200).send(rides);
  } catch (err) {
    console.error("Error fetching driver rides", err);
    res.status(500).send({ error: err.message });
  }
});

router.get("/bookings/my", auth, async (req, res) => {
  try {
    const rides = await RideService.getRidesBookedByUser(req.user._id);
    res.status(200).send(rides);
  } catch (err) {
    console.error("Error fetching passenger rides", err);
    res.status(500).send({ error: err.message });
  }
});

// Enhanced search endpoint
router.get("/search", async (req, res) => {
  try {
    const searchParams = {
      lat: req.query.lat,
      lng: req.query.lng,
      maxDistance: req.query.maxDistance,
      destLat: req.query.destLat,
      destLng: req.query.destLng,
      destMaxDistance: req.query.destMaxDistance,
      date: req.query.date,
      from: req.query.from,
      to: req.query.to,
      passengers: req.query.passengers,
      vehicleType: req.query.vehicleType,
      sortBy: req.query.sortBy || 'relevance',
      maxPrice: req.query.maxPrice,
      timeWindow: parseInt(req.query.timeWindow) || 2,
      routeDeviation: parseInt(req.query.routeDeviation) || 10000,
      enRouteMatching: req.query.enRouteMatching !== 'false',
    };

    console.log("Enhanced search parameters received:", searchParams);

    const validation = validateSearchParams(searchParams);
    if (!validation.isValid) {
      return res.status(400).send({ 
        error: "Invalid search parameters", 
        details: validation.errors
      });
    }

    const rides = await RideService.searchRides(searchParams);

    // Add metadata to response
    const response = {
      rides,
      metadata: {
        totalResults: rides.length,
        searchParams,
        timestamp: new Date().toISOString(),
        features: {
          enRouteMatching: searchParams.enRouteMatching,
          timeWindow: searchParams.timeWindow,
          routeDeviation: searchParams.routeDeviation
        }
      }
    };

    return res.status(200).send(response);
  } catch (err) {
    console.error("Error searching rides", err);
    res.status(400).send({ error: err.message || "Failed to search rides" });
  }
});

// New endpoint for route suggestions
router.get("/route-suggestions", async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).send({ error: "Both 'from' and 'to' parameters are required" });
    }

    // Get popular routes that match the pattern
    const suggestions = await Ride.aggregate([
      {
        $match: {
          $or: [
            { "origin.name": { $regex: from, $options: "i" } },
            { "destination.name": { $regex: to, $options: "i" } }
          ]
        }
      },
      {
        $group: {
          _id: {
            origin: "$origin.name",
            destination: "$destination.name"
          },
          count: { $sum: 1 },
          avgPrice: { $avg: "$pricePerSeat" }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.status(200).send({ suggestions });
  } catch (err) {
    console.error("Error getting route suggestions", err);
    res.status(500).send({ error: err.message });
  }
});

// Suggestions/autocomplete
router.get("/locations/suggest", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(200).send({ suggestions: [] });
    }
    const suggestions = getLocationSuggestions(q);
    res.status(200).send({ suggestions });
  } catch (err) {
    console.error("Error getting location suggestions", err);
    res.status(500).send({ error: err.message });
  }
});

// Validate a location name
router.get("/locations/validate", async (req, res) => {
  try {
    const { location } = req.query;
    if (!location) {
      return res.status(400).send({ error: "Location parameter is required" });
    }
    const validation = validateLocationName(location);
    res.status(200).send(validation);
  } catch (err) {
    console.error("Error validating location", err);
    res.status(500).send({ error: err.message });
  }
});

module.exports = router;
