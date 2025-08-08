const Ride = require("../models/Ride");
const express = require("express");
const router = express.Router();
const RideService = require("../services/RideService");
const { error } = require("winston");

router.post("/Ride", async (req, res) => {
  try {
    const ride = await RideService.createRide(req.user._id, req.body);
    res.status(201).send(ride);
  } catch (err) {
    console.log(`Error in Ride Creation `, err);
    return res.status(500).send(err.message);
  }
});
