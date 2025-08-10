const express = require("express");
const User = require("../controllers/AuthController");
const Ride = require("../controllers/RideController")
const Vechile = require('../controllers/VechileController')
const app = express();

module.exports = function (app) {
  app.use(express.json());
  app.use("/api/user", User);
  app.use("/api/Ride",Ride)
  app.use("/api/Vechile",Vechile)
};
