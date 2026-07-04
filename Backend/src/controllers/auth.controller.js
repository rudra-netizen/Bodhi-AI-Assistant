const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function registerUser(req, res) {
  const {
    fullname: { firstname, lastname },
    email,
    password,
  } = req.body;
  const isUserAlreadyExists = await userModel.findOne({
    email,
  });

  if (isUserAlreadyExists) {
    return res.status(400).json({
      message: "User Already Exists",
    });
  }
  const hashpassword = await bcrypt.hash(password, 10);
  const user = await userModel.create({
    fullname: {
      firstname,
      lastname,
    },
    email: email,
    password: hashpassword,
    provider: "local",
  });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY);
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
  });

  return res.status(201).json({
    message: "User Registered Successfully",
    user: { _id: user._id, email: user.email, fullname: user.fullname },
  });
}

async function loginUser(req, res) {
  const { email, password } = req.body;

  const user = await userModel.findOne({ email });
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

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({
      message: "invalid password",
    });
  }
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY);
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    message: "User Logged In SuccessFully",
    user: { user: user._id, email: user.email, fullname: user.fullname },
  });
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
    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;
    const firstname = payload.given_name || "User";
    const lastname = payload.family_name || "";

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
      res.cookie("token", jwtToken, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      });

      return res.status(201).json({
        message: "Account created successfully with Google",
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
      res.cookie("token", jwtToken, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        message: "Logged in successfully",
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
    console.error("Google Auth Error:", error.message);
    return res.status(401).json({
      message: "Invalid token or authentication failed",
      error: error.message,
    });
  }
}

module.exports = { registerUser, loginUser, googleAuth };
