const express = require("express");
const router = express.Router();
const AuthService = require("../services/AuthServices");
const auth = require("../middleware/auth");

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
    console.log("The login method is called with result",JSON.stringify(result));  
    return res
      .header("x-auth-token", result.data)
      .status(result.status)
      .send({message: result.message, data: result.data});
  } catch (err) {
    console.error("Error in login:", err);
    return res.status(500).send("Internal Server Error");
  }
});

router.put("/update",auth, async (req, res) => {
  try {
    // Assuming req.user._id comes from your auth middleware (JWT decoded)
    const result = await AuthService.updateUser(req.user._id, req.body);

    console.log("The update controller is called", result);

    return res.status(result.status).json(result.data);
  } catch (err) {
    console.error("Update User Error:", err);
    return res.status(500).json({ message: "Something went wrong while updating" });
  }
});

module.exports = router;
