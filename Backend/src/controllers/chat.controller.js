const chatModel = require("../models/chat.model");
const messageModel = require("../models/message.model");

async function createChat(req, res) {
  const { title } = req.body;
  const user = req.user;
  const chat = await chatModel.create({
    user: user._id,
    title,
  });
  res.status(201).json({
    message: "Chat Created Successfully",
    chat: {
      _id: chat._id,
      title: chat.title,
      lastActivity: chat.lastActivity,
    },
  });
}

async function getChats(req, res) {
  const user = req.user;
  const chats = await chatModel.find({ user: user._id });
  res.status(200).json({
    message: "Chats Retrieved Successfully",
    chats,
  });
}

async function handleMessage(req, res) {
  const { message, chatId } = req.body;
  const user = req.user;
  const aiResponse = `Echo: ${message}`;
  res.status(200).json({
    message: "Message Sent Successfully",
    response: aiResponse,
  });
}

async function deleteChat(req, res) {
  const { chatId } = req.params;
  const user = req.user;

  /* Find chat by ID and verify it belongs to current user */
  const chat = await chatModel.findById(chatId);

  if (!chat) {
    return res.status(404).json({
      message: "Chat not found",
    });
  }

  /* Verify the chat belongs to the current user */
  if (chat.user.toString() !== user._id.toString()) {
    return res.status(403).json({
      message: "Unauthorized: You cannot delete this chat",
    });
  }

  /* Delete the chat */
  await chatModel.findByIdAndDelete(chatId);

  res.status(200).json({
    message: "Chat deleted successfully",
  });
}

async function getChatMessages(req, res) {
  const { chatId } = req.params;
  const user = req.user;

  try {
    /* Verify chat belongs to user */
    const chat = await chatModel.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        message: "Chat not found",
      });
    }

    if (chat.user.toString() !== user._id.toString()) {
      return res.status(403).json({
        message: "Unauthorized: Cannot access this chat",
      });
    }

    /* Fetch all messages for this chat */
    const messages = await messageModel
      .find({ chat: chatId })
      .sort({ createdAt: 1 }) // Oldest first
      .lean();

    res.status(200).json({
      message: "Messages retrieved successfully",
      messages,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({
      message: "Failed to retrieve messages",
    });
  }
}

module.exports = {
  createChat,
  getChats,
  handleMessage,
  deleteChat,
  getChatMessages,
};
