const mongoose = require("mongoose");
const joi = require("joi");

const Booking = mongoose.model(
  "User",
  new mongoose.Schema({
    name: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 40,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: Number,
      required: true,
      minlength: 6,
      maxlength: 10,
    },
  })
);
