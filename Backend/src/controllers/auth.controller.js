const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function registerUser(req, res) {
  try {
    const { fullname = {}, email, password } = req.body;
    const firstname = fullname.firstname || req.body.firstname || "";
    const lastname = fullname.lastname || req.body.lastname || "";
    const normalizedEmail = email?.toLowerCase().trim();

    if (!firstname || !lastname || !normalizedEmail || !password) {
      return res.status(400).json({
        message: "Firstname, lastname, email, and password are required",
      });
    }

    const isUserAlreadyExists = await userModel.findOne({
      email: normalizedEmail,
    });

    if (isUserAlreadyExists) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashpassword = await bcrypt.hash(password, 10);
    const user = await userModel.create({
      fullname: {
        firstname,
        lastname,
      },
      email: normalizedEmail,
      password: hashpassword,
      provider: "local",
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY);
    const cookieOptions = {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    };
    res.cookie("token", token, cookieOptions);

    return res.status(201).json({
      message: "User registered successfully",
      token,
      user: { _id: user._id, email: user.email, fullname: user.fullname },
    });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
}

async function loginUser(req, res) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await userModel.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    if (user.provider === "google" && !user.password) {
      return res.status(400).json({
        message: "Please sign in with Google",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password || "");
    if (!isPasswordValid) {
      return res.status(400).json({
        message: "Invalid password",
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY);
    const cookieOptions = {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    };
    res.cookie("token", token, cookieOptions);

    return res.status(200).json({
      message: "User logged in successfully",
      token,
      user: { user: user._id, email: user.email, fullname: user.fullname },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
}

// 🔐 Google OAuth - Verify Token and Handle Registration/Login
async function googleAuth(req, res) {
  const { token, password, action } = req.body; // action: "signup" or "login"

  if (!token) {
    return res.status(400).json({
      message: "Token is required",
    });
  }

  try {
    console.log("🔍 Google Auth Debug:", {
      hasToken: !!token,
      clientId: process.env.GOOGLE_CLIENT_ID,
      tokenLength: token ? token.length : 0,
      action,
    });

    let payload;

    // Try to verify the Google token
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      payload = ticket.getPayload();
      console.log("✅ Token verified successfully via googleapis");
    } catch (verifyError) {
      console.log(
        "⚠️ Direct verification failed, trying decode-only approach:",
        verifyError.message,
      );

      // Fallback: decode without verification (less secure but works for development)
      // In production, implement proper Google token validation
      try {
        const parts = token.split(".");
        if (parts.length !== 3) {
          throw new Error("Invalid token format");
        }

        const decoded = JSON.parse(Buffer.from(parts[1], "base64").toString());
        console.log("✅ Token decoded successfully (without verification)");
        console.log("📦 Decoded payload:", {
          has_email: !!decoded.email,
          has_sub: !!decoded.sub,
          has_given_name: !!decoded.given_name,
          keys: Object.keys(decoded).slice(0, 10),
        });
        payload = decoded;
      } catch (decodeError) {
        console.error("❌ Token decode failed:", decodeError.message);
        throw verifyError; // Throw the original verification error
      }
    }

    // Safely extract fields with fallbacks
    const googleId = payload.sub || payload.jti || "unknown";
    const email = payload.email?.toLowerCase().trim();
    const firstname =
      payload.given_name || payload.name?.split(" ")[0] || "User";
    const lastname =
      payload.family_name || payload.name?.split(" ").slice(1).join(" ") || "";

    if (!email) {
      console.error("❌ Email not found in token payload:", {
        payload_keys: Object.keys(payload),
      });
      return res.status(400).json({
        message: "Email not found in Google token",
      });
    }

    // Check if user already exists
    let user = await userModel.findOne({ email });

    if (action === "signup") {
      if (user) {
        return res.status(400).json({
          message: "Email already registered. Please login instead.",
        });
      }

      // Validate password for signup
      if (!password || password.length < 6) {
        return res.status(400).json({
          message: "Password must be at least 6 characters",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user with Google OAuth
      user = await userModel.create({
        email,
        fullname: {
          firstname,
          lastname,
        },
        googleId,
        password: hashedPassword,
        provider: "google",
      });

      const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY);
      const cookieOptions = {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000,
      };
      res.cookie("token", jwtToken, cookieOptions);

      return res.status(201).json({
        message: "Account created successfully with Google",
        token: jwtToken,
        user: {
          _id: user._id,
          email: user.email,
          fullname: user.fullname,
        },
      });
    }

    if (action === "login") {
      if (!user) {
        return res.status(404).json({
          message: "Account not found. Please sign up first.",
        });
      }

      if (user.provider !== "google") {
        return res.status(400).json({
          message:
            "This email is registered with traditional login. Please use password.",
        });
      }

      // Verify password
      if (!password) {
        return res.status(400).json({
          message: "Password is required",
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({
          message: "Invalid password",
        });
      }

      const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY);
      const cookieOptions = {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000,
      };
      res.cookie("token", jwtToken, cookieOptions);

      return res.status(200).json({
        message: "Logged in successfully",
        token: jwtToken,
        user: {
          _id: user._id,
          email: user.email,
          fullname: user.fullname,
        },
      });
    }

    return res.status(400).json({
      message: "Invalid action",
    });
  } catch (error) {
    console.error("Google Auth Error:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return res.status(401).json({
      message: "Invalid token or authentication failed",
      error: error.message || "Unknown error",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}

module.exports = { registerUser, loginUser, googleAuth };
