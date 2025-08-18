const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Booking = require("../models/Booking");
const Chat = require("../models/Chat");
const Notification = require("../models/Notification");
const Ride = require("../models/Ride");
const User = require("../models/User");

const auth = require("../middleware/auth");
const { validateBookingRequest } = require("../utils/validatorUtils");

// Utility: safe toString for ObjectId
const oid = (v) => (typeof v === "string" ? v : v?.toString());

// POST /api/bookings  – create booking + (optional) first chat message
router.post("/", auth, async (req, res) => {
  try {

    console.log("The Book Creation is called",req.body)
    const { rideId, message } = req.body;
    const passengerId = req.user._id;

    // 1) Validate input (kept from your code)
    const validation = validateBookingRequest(req.body);
    if (!validation.isValid) {
      return res.status(400).send({ error: validation.errors });
    }

    // 2) Check ride exists
    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).send({ error: "Ride not found" });

    // 3) Prevent duplicate active booking by the same passenger for same ride
    const existingBooking = await Booking.findOne({
      rideId,
      passengerId,
      status: { $in: ["Pending", "Approved"] },
    });
    if (existingBooking) {
      return res
        .status(400)
        .send({ error: "You already have a booking for this ride" });
    }

    // 4) Create booking (seatsRequested = 1 by default; add to schema if you plan multiples)
    const booking = await Booking.create({
      rideId,
      passengerId,
      driverId: ride.driverId,
      status: "Pending",
      requestedAt: new Date(),
    });

    // 5) Ensure chat exists between passenger & driver for this ride
    let chat = await Chat.findOne({
      rideId,
      participants: { $all: [passengerId, ride.driverId] },
    });

    if (!chat) {
      chat = await Chat.create({
        participants: [passengerId, ride.driverId],
        rideId,
        bookingId: booking._id,
        messages: [],
        lastMessage: new Date(),
      });
    }

    // 6) Add initial message (optional)
    if (message && message.trim()) {
      const msg = {
        senderId: passengerId,
        receiverId: ride.driverId,
        content: message.trim(),
        messageType: "text",
        timestamp: new Date(),
        isRead: false,
      };
      chat.messages.push(msg);
      chat.lastMessage = msg.timestamp;
      await chat.save();

      // realtime chat preview to both participants (ride room)
      global.socketService?.sendToRide(oid(rideId), "newMessage", {
        chatId: chat._id,
        ...msg,
      });
    }

    // 7) Notify driver (DB + realtime)
    const notification = await Notification.create({
      recipientId: ride.driverId,
      senderId: passengerId,
      type: "booking_request",
      title: "New Booking Request",
      message: `You have a new booking request for your ride from ${ride.origin?.name} to ${ride.destination?.name}`,
      data: {
        bookingId: booking._id,
        rideId,
        passengerId,
      },
    });

    global.socketService?.sendToUser(oid(ride.driverId), "booking-request", {
      _id: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      createdAt: notification.createdAt,
    });

    // 8) Response
    res.status(201).send({
      message: "Booking request sent successfully",
      booking: {
        id: booking._id,
        status: booking.status,
        requestedAt: booking.requestedAt,
      },
      chat: {
        id: chat._id,
        lastMessage: chat.lastMessage,
      },
      notification: { id: notification._id },
    });
  } catch (err) {
    console.error("Error creating booking:", err);
    res.status(500).send({ error: "Failed to create booking request" });
  }
});

// GET /api/bookings/my?type=passenger|driver&status=Pending|Approved|Rejected
router.get("/my", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, type } = req.query;

    const query = {};
    if (type === "passenger") query.passengerId = userId;
    else if (type === "driver") query.driverId = userId;
    else query.$or = [{ passengerId: userId }, { driverId: userId }];

    if (status) query.status = status;

    const bookings = await Booking.find(query)
      .populate("rideId", "origin destination dateTime pricePerSeat")
      .populate("passengerId", "name email phone")
      .populate("driverId", "name email phone")
      .sort({ requestedAt: -1 });

    res.status(200).send(bookings);
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res.status(500).send({ error: "Failed to fetch bookings" });
  }
});

// PUT /api/bookings/:bookingId/status  – driver approves/rejects
router.put("/:bookingId/status", auth, async (req, res) => {
  try {
    const { status } = req.body; // 'Approved' | 'Rejected'
    const { bookingId } = req.params;
    const driverId = req.user._id;

    if (!["Approved", "Rejected"].includes(status)) {
      return res
        .status(400)
        .send({ error: "Invalid status. Must be 'Approved' or 'Rejected'" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).send({ error: "Booking not found" });

    if (oid(booking.driverId) !== oid(driverId)) {
      return res
        .status(403)
        .send({ error: "You can only update your own ride bookings" });
    }

    if (booking.status !== "Pending") {
      return res.status(400).send({ error: "Booking is no longer pending" });
    }

    // Update booking status (+ approvedAt)
    booking.status = status;
    if (status === "Approved") booking.approvedAt = new Date();
    await booking.save();

    // If approved, decrement available seats (assumes 1 seat; adapt if you add seatsRequested)
    if (status === "Approved") {
      const ride = await Ride.findById(booking.rideId);
      if (!ride) return res.status(404).send({ error: "Ride not found" });
      if (ride.availableSeats <= 0) {
        // roll back booking status if no seats
        booking.status = "Rejected";
        booking.approvedAt = undefined;
        await booking.save();
        return res
          .status(409)
          .send({ error: "No seats available. Booking rejected." });
      }
      await Ride.findByIdAndUpdate(ride._id, { $inc: { availableSeats: -1 } });
    }

    // Notify passenger (DB + realtime)
    const notification = await Notification.create({
      recipientId: booking.passengerId,
      senderId: driverId,
      type: status === "Approved" ? "booking_approved" : "booking_rejected",
      title: status === "Approved" ? "Booking Approved!" : "Booking Rejected",
      message:
        status === "Approved"
          ? "Your booking request has been approved by the driver!"
          : "Your booking request has been rejected by the driver.",
      data: {
        bookingId: booking._id,
        rideId: booking.rideId,
        status,
      },
    });

    global.socketService?.sendToUser(
      oid(booking.passengerId),
      "booking-update",
      {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        createdAt: notification.createdAt,
      }
    );

    res.status(200).send({
      message: `Booking ${status.toLowerCase()} successfully`,
      booking,
    });
  } catch (err) {
    console.error("Error updating booking status:", err);
    res.status(500).send({ error: "Failed to update booking status" });
  }
});

// GET /api/bookings/:bookingId – booking details (authz check)
router.get("/:bookingId", auth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;

    const booking = await Booking.findById(bookingId)
      .populate("rideId", "origin destination dateTime pricePerSeat driverId")
      .populate("passengerId", "name email phone")
      .populate("driverId", "name email phone");

    if (!booking) return res.status(404).send({ error: "Booking not found" });

    if (
      oid(booking.passengerId._id) !== oid(userId) &&
      oid(booking.driverId._id) !== oid(userId)
    ) {
      return res.status(403).send({ error: "Unauthorized access" });
    }

    res.status(200).send(booking);
  } catch (err) {
    console.error("Error fetching booking details:", err);
    res.status(500).send({ error: "Failed to fetch booking details" });
  }
});

module.exports = router;
