const express = require("express");
const authControllers = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", authControllers.registerUser);
router.post("/login", authControllers.loginUser);
router.post("/google", authControllers.googleAuth); // Google OAuth endpoint

module.exports = router;
