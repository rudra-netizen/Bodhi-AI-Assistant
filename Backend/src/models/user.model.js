const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullname: {
      firstname: {
        type: String,
        required: true,
      },
      lastname: {
        type: String,
        required: true,
      },
    },
    password: {
      type: String,
      default: null, // Optional for OAuth users
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
    },
    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
  },
  {
    timestamps: true,
  },
);

const userModel = mongoose.model("user", userSchema);

module.exports = userModel;
