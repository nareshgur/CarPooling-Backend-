const Ride = require("../models/Ride");
const express = require("express");
const router = express.Router();
const RideService = require("../services/RideService");
const { error } = require("winston");
const { route } = require("./AuthController");
const auth = require("../middleware/auth");

router.post("/Ride", auth,async (req, res) => {
  try {
    const ride = await RideService.createRide(req.user._id, req.body);
    res.status(201).send(ride);
  } catch (err) {
    console.log(`Error in Ride Creation `, err);
    return res.status(500).send(err.message);
  }
});

router.get("/",async(req,res)=>{

})

router.put('/:rideId', auth, async (req, res) => {
  try {
    const driverId = req.user._id;
    const rideId = req.params.rideId;

    const result = await RideService.updateRideAndVehicle(driverId, rideId, req.body);
    res.status(200).send(result);
  } catch (err) {
    console.error("Error updating ride and vehicle", err);
    res.status(500).send({ error: err.message });
  }
});



module.exports = router