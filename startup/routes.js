const express = require("express");
const User = require("../controllers/AuthController");
const app = express();

module.exports = function (app) {
  app.use(express.json());
  app.use("/api/user", User);
};
