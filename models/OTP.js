const { ref } = require("joi");
const mongoose = require("mongoose");

const OTP = mongoose.model(
  "OTP",
  new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    otp: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 300,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  })
);

exports.OTP = OTP;
