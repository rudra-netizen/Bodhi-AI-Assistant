require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/db/db");
const initSocketServer = require("./src/sockets/socket.server");
const http = require("http");

const httpServer = http.createServer(app);

async function startServer() {
  try {
    await connectDB();
    initSocketServer(httpServer);

    const port = Number(process.env.PORT || 8000);

    httpServer.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(
          `Port ${port} is already in use. Stop the existing process or set a different PORT.`,
        );
      } else {
        console.error("Server error:", error);
      }
      process.exit(1);
    });

    httpServer.listen(port, () => {
      console.log(`The server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
