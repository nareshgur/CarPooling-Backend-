const { required } = require("joi");
const { trim, truncate } = require("lodash");
const mongoose = require("mongoose");

const Ride = mongoose.model(
  new mongoose.Schema({
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    origin: {
      type: String,
      required: true,
      trim: true,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },
    dateTime: {
      type: Date,
      required: true,
    },
    availableSeats: {
      type: Number,
      required: true,
      min: 1,
    },
    pricePerSeat: {
      type: Number,
      required: true,
      min: 0,
    },
    stops: [
      {
        type: String,
        trim: true,
      },
    ],
    vechile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vechile",
      required: true,
    },
  })
);

module.exports = Ride;
