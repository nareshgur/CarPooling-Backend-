const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, validate } = require("../models/User");

exports.registerUser = async (body) => {
  const { error } = validate(body);
  console.log("body is", body);
  if (error) return { status: 400, data: error.details[0].message };

  const existingUser = await User.findOne({ email: body.email });
  if (existingUser) return { status: 400, data: "User already registered." };

  const salt = await bcrypt.genSalt(10);
  console.log("Password is ", body.password);
  console.log("salt", salt);
  const hashedPassword = await bcrypt.hash(body.Password, salt);
  console.log("hashed password", hashedPassword);
  const user = new User({
    name: body.name,
    email: body.email,
    phone: body.phone,
    Password: hashedPassword,
    // isVerified: false,/
  });

  await user.save();

  return { status: 200, data:{message: "Registered successfully"} };
};

exports.loginUser = async ({ email, Password }) => {
  const user = await User.findOne({ email });
  if (!user) return { status: 400, data: "Invalid email or password" };

  //   if (!user.isVerified)
  //     return { status: 403, data: "User not verified. Please verify OTP." };

  const validPassword = await bcrypt.compare(Password, user.Password);
  if (!validPassword) return { status: 400, data: "Invalid email or password" };

  const token = jwt.sign(
    { _id: user._id, email: user.email },
    process.env.jwtPrivateKey
  );


  return { status: 200, message: "Login successful", data: {token}};
};
