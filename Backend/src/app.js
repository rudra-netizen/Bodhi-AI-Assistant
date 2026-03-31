const cookieParser = require("cookie-parser");
const express = require("express");
const authRoutes = require("./routes/auth.route");
const chatRoutes = require("./routes/chat.routes");
const cors = require("cors");

const app = express();
app.get("/", (req, res) => {
  res.send("Bodhi AI Assistant is running 🚀");
});
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

module.exports = app;
