const express = require("express");
const cors = require("cors");

const User = require("../controllers/AuthController");
const Ride = require("../controllers/RideController");
const Route = require("../controllers/RouteController");
const Vechile = require("../controllers/VechileController");
const Booking = require("../controllers/BookingController");
const Chat = require("../controllers/ChatController");
const Notification = require("../controllers/NotificationController");

module.exports = function (app) {
  // ✅ Apply CORS at the very top
  app.use(
    cors({
      origin: "http://localhost:5173",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
      credentials: true,
    })
  );

  // ✅ Handle preflight requests explicitly
  app.options("*", cors());

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ✅ Routes
  app.use("/api/directions", Route);
  app.use("/api/user", User);
  app.use("/api/ride", Ride);
  app.use("/api/vechile", Vechile);
  app.use("/api/booking", Booking);
  app.use("/api/chats", Chat);
  app.use("/api/notification", Notification);
};



// console.log("The server started at PORT : 3000")