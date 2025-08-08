const { required } = require("joi");
const { default: mongoose } = require("mongoose");
const mongoose = require("mongoose");

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
      unique: true,
    },
  })
);

module.exports = Vechile;
