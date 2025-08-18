const winston = require("winston");
const express = require("express");
const app = express();
require("dotenv").config();

require("./startup/logging")();
require("./startup/routes")(app);
require("./startup/db")();
require("./startup/config")();

const port = process.env.PORT || 3000;
const server = app.listen(port, () =>
  winston.info(`Listening on port ${port}...`)
);

const SocketService = require('./services/SocketService');

// Initialize Socket.IO service
const socketService = new SocketService(server);

// Make socket service available globally
global.socketService = socketService;

module.exports = server;
