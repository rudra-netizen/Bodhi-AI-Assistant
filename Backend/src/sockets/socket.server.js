const { Server } = require("socket.io");
const cookie = require("cookie");
const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const aiService = require("../services/ai.service");
const messageModel = require("../models/message.model");
const { createMemory, queryMemory } = require("../services/vector.service");

function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: ["http://localhost:5173", "http://localhost:5174"],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });
  io.use(async (socket, next) => {
    const cookies = cookie.parse(socket.handshake.headers?.cookie || "");
    if (!cookies.token) {
      next(new Error("Authentication Error: Invalid token"));
    }
    try {
      const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET_KEY);
      const user = await userModel.findById(decoded.id);
      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Authentication Error: Invalid token"));
    }
  });
  io.on("connection", (socket) => {
    //messagePayload{
    //chat: chatid
    //content: message
    //}
    console.log("✅ User connected:", socket.user?.email || socket.id);

    socket.on("ai-message", async (messagePayLoad) => {
      console.log("📨 ai-message received:", messagePayLoad);

      let responseSent = false; // Prevent duplicate emissions

      /* Timeout handler - send back error if processing takes too long */
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error("AI response timeout - took longer than 120 seconds"),
            ),
          120000, // 120 seconds timeout
        ),
      );

      /* Main processing with timeout */
      const mainProcess = async () => {
        try {
          console.time("⏱️ Total ai-message processing");

          console.time("⏱️ User message save + vector");
          const [message, vectors] = await Promise.all([
            await messageModel.create({
              chat: messagePayLoad.chat,
              user: socket.user._id,
              content: messagePayLoad.content,
              role: "user",
            }),
            await aiService.generateVector(messagePayLoad.content),
          ]);
          console.timeEnd("⏱️ User message save + vector");

          if (Array.isArray(vectors) && vectors.length > 0) {
            console.time("⏱️ Create user memory");
            await createMemory({
              vector: vectors,
              messageId: message._id.toString(),
              metadata: {
                chat: messagePayLoad.chat.toString(),
                user: socket.user._id.toString(),
                text: messagePayLoad.content,
              },
            });
            console.timeEnd("⏱️ Create user memory");
          } else {
            console.warn(
              "Skipping createMemory: vectors invalid for user message",
              { messageId: message._id.toString() },
            );
          }

          console.time("⏱️ Memory query + chat history");
          //let memory = null;
          /*
          if (Array.isArray(vectors) && vectors.length > 0) {
            memory = await queryMemory({
              queryVector: vectors,
              limit: 1,
              metadata: {},
            });
            //console.log(memory);
          } else {
            console.warn("Skipping queryMemory: vectors invalid for user message", {
              messageId: message._id.toString(),
            });
          }

          const chatHistory = (
            await messageModel
              .find({
                chat: messagePayLoad.chat,
              })
              .sort({ createdAt: -1 })
              .limit(20)
              .lean()
          ).reverse();*/

          const [memory, chatHistory] = await Promise.all([
            (async () => {
              if (Array.isArray(vectors) && vectors.length > 0) {
                return await queryMemory({
                  queryVector: vectors,
                  limit: 1,
                  metadata: {},
                });
              } else {
                console.warn(
                  "Skipping queryMemory: vectors invalid for user message",
                  {
                    messageId: message._id.toString(),
                  },
                );
                return [];
              }
            })(),
            (async () => {
              const history = await messageModel
                .find({
                  chat: messagePayLoad.chat,
                })
                .sort({ createdAt: -1 })
                .limit(20)
                .lean();
              return history.reverse();
            })(),
          ]);
          console.timeEnd("⏱️ Memory query + chat history");

          const stm = chatHistory.map((item) => {
            return {
              role: item.role,
              parts: [{ text: item.content }],
            };
          });

          const ltm = [
            {
              role: "user",
              parts: [
                {
                  text:
                    "You are a helpful assistant. Use the following information from the conversation history to answer the user's question. If the information is not relevant, you can ignore it. Always try to use the information to provide a better answer.\n\n" +
                    memory.map((m) => m.metadata.text).join("\n\n"),
                },
              ],
            },
          ];

          let response;
          try {
            console.log("🔄 Calling AI service...");
            response = await aiService.generateResponse([...ltm, ...stm]);
            console.log(
              "🤖 AI Response generated:",
              response?.substring(0, 100),
            );
          } catch (aiError) {
            console.error("❌ AI Service Error:", aiError.message);
            /* Fallback response if AI fails */
            response = `I encountered an error processing your request. Error: ${aiError.message}. Your message was: "${messagePayLoad.content}"`;
          }

          /*const responseMessage = await messageModel.create({
            chat: messagePayLoad.chat,
            user: socket.user._id,
            content: response,
            role: "model",
          });
          const responseVector = await aiService.generateVector(response);*/

          /* Send response ONCE */
          if (!responseSent) {
            responseSent = true;
            socket.emit("ai-response", {
              content: response,
              chat: messagePayLoad.chat,
            });
            console.log("✅ ai-response sent to client");
          }

          /* Save to database in parallel - don't wait for this to complete */
          console.time("⏱️ Save AI response + vector");
          const [responseMessage, responseVector] = await Promise.all([
            await messageModel.create({
              chat: messagePayLoad.chat,
              user: socket.user._id,
              content: response,
              role: "model",
            }),
            await aiService.generateVector(response),
          ]);
          console.timeEnd("⏱️ Save AI response + vector");

          if (Array.isArray(responseVector) && responseVector.length > 0) {
            console.time("⏱️ Create AI response memory");
            await createMemory({
              vector: responseVector,
              messageId: responseMessage._id.toString(),
              metadata: {
                chat: messagePayLoad.chat.toString(),
                user: socket.user._id.toString(),
                text: response,
              },
            });
            console.timeEnd("⏱️ Create AI response memory");
          } else {
            console.warn(
              "Skipping createMemory: vectors invalid for AI response",
              {
                messageId: responseMessage._id.toString(),
              },
            );
          }

          console.timeEnd("⏱️ Total ai-message processing");
        } catch (error) {
          /* Catch and emit error back to client - ONLY ONCE */
          if (!responseSent) {
            responseSent = true;
            console.error("Error in ai-message handler:", error);
            socket.emit("ai-error", {
              message: error.message || "Failed to process your message",
            });
          }
        }
      };

      /* Run main process with timeout race */
      try {
        await Promise.race([mainProcess(), timeoutPromise]);
      } catch (error) {
        /* Catch timeout and other errors */
        if (!responseSent) {
          responseSent = true;
          console.error("❌ Fatal error in ai-message handler:", error.message);
          socket.emit("ai-error", {
            message: error.message || "Failed to process your message",
          });
        }
      }
    });
  });
}

module.exports = initSocketServer;
