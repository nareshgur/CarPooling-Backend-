const { required } = require("joi");
const mongoose = require("mongoose");
// const { VechileType } = require("../utils/enums");

const Vechile = mongoose.model(
  "Vechile",
  new mongoose.Schema({
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    make: {
      type: String,
      required: true,
    },
    model: {
      type: String,
      required: true,
    },
    plateNumber: {
      type: String,
      required: true,
      // unique: true,
    },
    VechileType: {
      type: String,
      enum: ["car", "bike"],
      required: true,
    },
  })
);

module.exports = Vechile;
