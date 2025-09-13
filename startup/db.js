const winston = require("winston");
const mongoose = require("mongoose");
// const config = require("config");

module.exports = function () {
  const db = process.env.DB;
  mongoose
    .connect(`mongodb+srv://nareshgurrala37:Ggsh%405502!.@cluster0.1xhzokj.mongodb.net/`)
    .then(() => winston.info(`Connected to ${db}...`))
    .catch((err) => winston.error("Could not connect because of ", err));
};
