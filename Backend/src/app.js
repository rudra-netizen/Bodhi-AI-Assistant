const cookieParser = require("cookie-parser");
const express = require("express");
const authRoutes = require("./routes/auth.route");
const chatRoutes = require("./routes/chat.routes");
const cors = require("cors");
const path = require("path");
const app = express();
app.get("/", (req, res) => {
  res.send("Bodhi AI Assistant is running 🚀");
});

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://bodhi-ai-assistant-1.onrender.com",
  "http://localhost:5173",
  "http://localhost:5174",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(
        new Error(`CORS policy does not allow access from origin ${origin}`),
      );
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../public")));
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});
module.exports = app;
