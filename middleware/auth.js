const jwt = require("jsonwebtoken");
const config = require("config");

module.exports = function (req, res, next) {
  const token = req.header("x-auth-token");
  // console.log(token)
  if (!token) return res.status(401).send("Access denied, No token provided");

  try {
    const decoded = jwt.verify(token, process.env.jwtPrivateKey);
    req.user = decoded;
    next();
  } catch (err) {
    console.log("something went wrong In auth middleware", err);
    res.status(400).send("Invalid Token");
  }
};
