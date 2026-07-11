const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const chatController = require("../controllers/chat.controller");

const router = express.Router();

router.post("/", authMiddleware, chatController.createChat);
router.get("/", authMiddleware, chatController.getChats);
router.get(
  "/:chatId/messages",
  authMiddleware,
  chatController.getChatMessages,
); /* Get messages for specific chat */
router.post("/message", authMiddleware, chatController.handleMessage);
/* DELETE route to delete a specific chat by ID */
router.delete("/:chatId", authMiddleware, chatController.deleteChat);

module.exports = router;
