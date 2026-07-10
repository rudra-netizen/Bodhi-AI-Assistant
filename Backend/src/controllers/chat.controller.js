const chatModel = require("../models/chat.model");
const messageModel = require("../models/message.model");
const aiService = require("../services/ai.service");
const { createMemory } = require("../services/vector.service");

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

async function handleImageUpload(req, res) {
  const { chatId, imageBase64, imageType, caption } = req.body;
  const user = req.user;

  if (!chatId || !imageBase64) {
    return res.status(400).json({
      message: "chatId and imageBase64 are required",
    });
  }

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

  const userMessageContent = caption
    ? `User uploaded an image and added: "${caption}"`
    : `User uploaded an image (${imageType || "image"})`;

  try {
    const userMessage = await messageModel.create({
      chat: chatId,
      user: user._id,
      content: userMessageContent,
      role: "user",
    });

    const aiResponse = await aiService.generateImageInsights({
      imageBase64,
      imageType,
      caption,
    });

    const responseMessage = await messageModel.create({
      chat: chatId,
      user: user._id,
      content: aiResponse,
      role: "model",
    });

    const [userVector, responseVector] = await Promise.all([
      aiService.generateVector(userMessage.content),
      aiService.generateVector(aiResponse),
    ]);

    if (Array.isArray(userVector) && userVector.length > 0) {
      await createMemory({
        vector: userVector,
        messageId: userMessage._id.toString(),
        metadata: {
          chat: chatId.toString(),
          user: user._id.toString(),
          text: userMessage.content,
        },
      });
    }

    if (Array.isArray(responseVector) && responseVector.length > 0) {
      await createMemory({
        vector: responseVector,
        messageId: responseMessage._id.toString(),
        metadata: {
          chat: chatId.toString(),
          user: user._id.toString(),
          text: aiResponse,
        },
      });
    }

    res.status(200).json({
      message: "Image analyzed successfully",
      insights: aiResponse,
    });
  } catch (error) {
    console.error("[CHAT_CONTROLLER] Error handling image upload:");
    console.error("[CHAT_CONTROLLER] Error message:", error.message);
    console.error("[CHAT_CONTROLLER] Error code:", error.code);
    console.error(
      "[CHAT_CONTROLLER] Full error:",
      JSON.stringify(error, null, 2),
    );

    res.status(500).json({
      message: "Failed to analyze uploaded image",
      error: error.message,
      details:
        process.env.NODE_ENV === "development" ? error.toString() : undefined,
    });
  }
}

// New: handle image generation request (text -> images)
async function handleGenerateImage(req, res) {
  const { chatId, prompt, size = "1024x1024", count = 1 } = req.body;
  const user = req.user;

  if (!chatId || !prompt) {
    return res.status(400).json({ message: "chatId and prompt are required" });
  }

  const chat = await chatModel.findById(chatId);
  if (!chat) return res.status(404).json({ message: "Chat not found" });

  if (chat.user.toString() !== user._id.toString()) {
    return res
      .status(403)
      .json({ message: "Unauthorized: Cannot access this chat" });
  }

  try {
    console.log("[CHAT_CONTROLLER] handleGenerateImage request", {
      chatId,
      prompt,
      size,
      count,
      user: user._id.toString(),
    });

    const userMessage = await messageModel.create({
      chat: chatId,
      user: user._id,
      content: `Generate image: "${prompt}"`,
      role: "user",
    });

    const images = await aiService.generateGeminiImages({
      prompt,
      size,
      count,
    });

    const createdResponses = [];
    for (const img of images) {
      const responseMessage = await messageModel.create({
        chat: chatId,
        user: user._id,
        content: img,
        role: "model",
      });
      createdResponses.push(responseMessage);
    }

    // Create vectors for prompt and a short response summary
    const [userVector, responseVector] = await Promise.all([
      aiService.generateVector(userMessage.content),
      aiService.generateVector(
        `Generated ${images.length} image(s) for prompt: ${prompt}`,
      ),
    ]);

    if (Array.isArray(userVector) && userVector.length > 0) {
      await createMemory({
        vector: userVector,
        messageId: userMessage._id.toString(),
        metadata: {
          chat: chatId.toString(),
          user: user._id.toString(),
          text: userMessage.content,
        },
      });
    }

    if (Array.isArray(responseVector) && responseVector.length > 0) {
      await createMemory({
        vector: responseVector,
        messageId: createdResponses[0]._id.toString(),
        metadata: {
          chat: chatId.toString(),
          user: user._id.toString(),
          text: `Generated ${images.length} image(s)`,
        },
      });
    }

    res.status(200).json({ message: "Images generated successfully", images });
  } catch (error) {
    console.error("[CHAT_CONTROLLER] Error generating images:", error);
    if (error?.response) {
      console.error("[CHAT_CONTROLLER] Error response:", error.response);
    }
    res.status(500).json({
      message: "Failed to generate images",
      error: error.message,
      details: error?.response?.data || null,
    });
  }
}

module.exports = {
  createChat,
  getChats,
  handleMessage,
  deleteChat,
  getChatMessages,
  handleImageUpload,
  handleGenerateImage,
};
