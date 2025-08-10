const express = require("express");
const router = express.Router();
const AuthService = require("../services/AuthServices");

router.post("/register", async (req, res) => {
  try {
    const result = await AuthService.registerUser(req.body);
    return res.status(result.status).send(result.data);
  } catch (err) {
    console.error("Error in register:", err);
    return res.status(500).send("Internal Server Error");
  }
});

router.post("/login", async (req, res) => {
  try {
    const result = await AuthService.loginUser(req.body);
    return res.header('x-auth-token',result.data).status(result.status).send(result.data);
  } catch (err) {
    console.error("Error in login:", err);
    return res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
