const express = require("express");
const authControllers = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", authControllers.registerUser);
router.post("/login", authControllers.loginUser);
router.post("/google", authControllers.googleAuth); // Google OAuth endpoint

// ✅ Debug endpoint to test token
router.get("/debug/config", (req, res) => {
  res.json({
    google_client_id: process.env.GOOGLE_CLIENT_ID ? "✅ Set" : "❌ Missing",
    jwt_secret: process.env.JWT_SECRET_KEY ? "✅ Set" : "❌ Missing",
    node_env: process.env.NODE_ENV,
  });
});

module.exports = router;
