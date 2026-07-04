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

    const basePort = Number(process.env.PORT || 8000);

    const tryListen = (port) => {
      httpServer.removeAllListeners("error");
      httpServer.on("error", (error) => {
        if (error.code === "EADDRINUSE") {
          const fallbackPort = port + 1;
          console.warn(`Port ${port} is busy, trying ${fallbackPort}...`);
          tryListen(fallbackPort);
        } else {
          console.error("Server error:", error);
          process.exit(1);
        }
      });

      httpServer.listen(port, () => {
        console.log(`The server is running on port ${port}`);
      });
    };

    tryListen(basePort);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
