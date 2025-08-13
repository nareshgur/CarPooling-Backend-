const mongoose = require("mongoose");
const { union } = require("lodash");
// const { UserRole } = require("../utils/enums");
const Joi = require("joi");

const User = mongoose.model(
  "User",
  new mongoose.Schema({
    name: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      minlength: 12,
      maxlength: 30,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
      minlength: 6,
      maxlength: 10,
    },
    Password: {
      type: String,
      required: true,
      minlength: 6,
      maxlength: 1024,
    },
    // isVerified: {
    //   type: Boolean,
    // },
  })
);

function validateUser(User) {
  const schema = Joi.object({
    name: Joi.string().min(3).max(255).required(),
    phone: Joi.string().required(),
    email: Joi.string().min(12).max(30).required().email(),
    Password: Joi.string().min(6).max(1024).required(),
  });

  return schema.validate(User);
}

exports.User = User;
exports.validate = validateUser;
