const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Booking = require("../models/Booking");
const Chat = require("../models/ChatLog");
const Notification = require("../models/Notification");
const Ride = require("../models/Ride");
const User = require("../models/User");
const bookingController = require("../controllers/BookingController");
const auth = require("../middleware/auth");
const {
  createBooking,
  approveBooking,
  // updateBooking,
  rejectBooking,
} = require("../services/BookingService");
const { validateBookingRequest } = require("../utils/validatorUtils");

// Utility: safe toString for ObjectId
const oid = (v) => (typeof v === "string" ? v : v?.toString());

// POST /api/bookings  – create booking + (optional) first chat message
router.post("/", auth, async (req, res) => {
  try {
    console.log("The Params received from the Frontend to the backend is ",req.body)
    const { rideId, driverId } = req.body;
    const passengerId = req.user._id;
    console.log('The booking controller is called ')
    const booking = await createBooking({ rideId, driverId, passengerId });
    res.status(201).json({ success: true, booking });
  } catch (err) {
    console.log("Create Booking Error :", err);
    res.status(500).json({ sucess: false, error: err.message });
  }
});

// GET /api/bookings/my?type=passenger|driver&status=Pending|Approved|Rejected
// router.get("/my", auth, async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { status, type } = req.query;

//     const query = {};
//     if (type === "passenger") query.passengerId = userId;
//     else if (type === "driver") query.driverId = userId;
//     else query.$or = [{ passengerId: userId }, { driverId: userId }];

//     if (status) query.status = status;

//     const bookings = await Booking.find(query)
//       .populate("rideId", "origin destination dateTime pricePerSeat")
//       .populate("passengerId", "name email phone")
//       .populate("driverId", "name email phone")
//       .sort({ requestedAt: -1 });

//     res.status(200).send(bookings);
//   } catch (err) {
//     console.error("Error fetching bookings:", err);
//     res.status(500).send({ error: "Failed to fetch bookings" });
//   }
// });

// PUT /api/bookings/:bookingId/status  – driver approves/rejects
router.put("/:id/approve", auth, async (req, res) => {
  try {
    const booking = await approveBooking(req.params.id, req.user._id);
    res.json({ sucess: true, booking });
  } catch (err) {
    console.log("Approve Booking Error", err);
    res.status(500).json({ success: false, error: err.message || "Server Error"});
  }
});

// GET /api/bookings/:bookingId – booking details (authz check)
// router.get("/:bookingId", auth, async (req, res) => {
//   try {
//     const { bookingId } = req.params;
//     const userId = req.user._id;

//     const booking = await Booking.findById(bookingId)
//       .populate("rideId", "origin destination dateTime pricePerSeat driverId")
//       .populate("passengerId", "name email phone")
//       .populate("driverId", "name email phone");

//     if (!booking) return res.status(404).send({ error: "Booking not found" });

//     if (
//       oid(booking.passengerId._id) !== oid(userId) &&
//       oid(booking.driverId._id) !== oid(userId)
//     ) {
//       return res.status(403).send({ error: "Unauthorized access" });
//     }

//     res.status(200).send(booking);
//   } catch (err) {
//     console.error("Error fetching booking details:", err);
//     res.status(500).send({ error: "Failed to fetch booking details" });
//   }
// });

router.put("/:id/reject",auth, async (req, res) => {
  try {
    console.log("The booking id received is ",req.params.id)
    const booking = await rejectBooking(req.params.id,req.user._id)
    return res.json({success:true,booking})
  } catch (err) {
    console.log("Reject Booking Error:",err)
    res.status(500).json({sucess:false,error:err.message || "Server Error"})
  }
});

// GET /api/bookings/my – get all bookings where the user is a passenger
router.get("/my", auth, async (req, res) => {
  console.log("My bookings is called here")
  try {
    const userId = req.user._id;
    console.log("The user id is",userId)

    const bookings = await Booking.find({ passengerId: userId })
      .populate("rideId", "origin destination dateTime pricePerSeat driverId")
      .populate("passengerId", "name email phone")
      .populate("driverId", "name email phone");

    res.status(200).send(bookings);
  } catch (err) {
    console.error("Error fetching passenger bookings:", err);
    res.status(500).send({ error: "Failed to fetch passenger bookings" });
  }
});


module.exports = router;
