const Ride = require("../models/Ride");
const express = require("express");
const router = express.Router();
const RideService = require("../services/RideService");
const { error } = require("winston");
const { route } = require("./AuthController");
const auth = require("../middleware/auth");

router.post("/Ride", async (req, res) => {
  try {
    const ride = await RideService.createRide(
      "689c2d880e3152e82e4e0e2f",
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

router.get("/search", async (req, res) => {
  try {
    const searchParams = {
      lat: req.query.lat,
      lon: req.query.lon,
      maxDistance: req.query.maxDistance, // ✅ fix
      destLat: req.query.destLat,
      destLng: req.query.destLng,
      destMaxDistance: req.query.destMaxDistance,
      date: req.query.date,
    };

    const rides = await RideService.searchRides(searchParams);
    res.status(200).send(rides);
  } catch (err) {
    console.error("Error searching rides", err);
    res.status(400).send({ error: err.message });
  }
});

module.exports = router;
