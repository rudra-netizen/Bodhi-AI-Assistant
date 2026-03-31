const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
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
module.exports = { registerUser, loginUser };
