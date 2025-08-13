const express = require("express");
const User = require("../controllers/AuthController");
const Ride = require("../controllers/RideController");
const Vechile = require("../controllers/VechileController");
const app = express();
const cors = require("cors");

module.exports = function (app) {
  app.use(
    cors({
      origin: "http://localhost:5173",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/api/user", User);
  app.use("/api/Ride", Ride);
  app.use("/api/Vechile", Vechile);
};
