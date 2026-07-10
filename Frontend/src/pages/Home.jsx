import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import "./Home.css";
import { io } from "socket.io-client";
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const Home = () => {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [previousChats, setPreviousChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const initializationRef = useRef(false); // Prevent double initialization in StrictMode
  const currentResponseRef = useRef(null); // Track the current streaming message ID

  // 🔹 Socket setup (initialize ONCE on mount)
  useEffect(() => {
    if (socketRef.current) return; // Already initialized

    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
    });

    socketRef.current = newSocket;

    newSocket.on("connect", () => {
      console.log("✅ Connected to Socket.IO server");
    });

    newSocket.on("disconnect", () => {
      console.log("⚠️ Disconnected from Socket.IO server");
    });

    console.log("🌐 Socket URL:", SOCKET_URL);
    console.log("🌐 API base URL:", API_BASE_URL);

    /* Error handling for socket connection */
    newSocket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
      setLoading(false);
    });

    // ✅ Handle streaming response chunks
    newSocket.on("ai-response-chunk", (message) => {
      const chunk = message.chunk;

      if (!currentResponseRef.current) {
        // Create new AI message for this response stream
        const aiMessageId = Date.now();
        currentResponseRef.current = aiMessageId;

        const aiMessage = {
          id: aiMessageId,
          text: chunk,
          sender: "ai",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);
      } else {
        // Append chunk to existing AI message
        setMessages((prev) => {
          const updated = [...prev];
          const lastMessage = updated[updated.length - 1];

          if (lastMessage && lastMessage.id === currentResponseRef.current) {
            lastMessage.text += chunk;
          }

          return updated;
        });
      }
    });

    // Handle stream completion
    newSocket.on("ai-response-complete", (message) => {
      console.log("✅ AI response stream completed");
      currentResponseRef.current = null;
      setLoading(false);

      // Sync with previousChats so the Sidebar stays updated
      setPreviousChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId
            ? { ...chat, messages: [...messages] }
            : chat,
        ),
      );
    });

    // ✅ FALLBACK: Listen to full AI response (for non-streamed responses)
    newSocket.on("ai-response", (message) => {
      const aiMessage = {
        id: Date.now(),
        text: message.content,
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setLoading(false);
      // Sync with previousChats so the Sidebar stays updated
      setPreviousChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId
            ? { ...chat, messages: [...chat.messages, aiMessage] }
            : chat,
        ),
      );
    });

    /* Error message handler */
    newSocket.on("ai-error", (error) => {
      console.error("AI Error:", error);
      setLoading(false);
      const errorMessage = {
        id: Date.now(),
        text: `Error: ${error.message || "Failed to get response from AI"}`,
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []); // Initialize once on mount

  // 🔹 Load previous chats on mount & prompt for title
  useEffect(() => {
    /* Prevent running twice in StrictMode */
    if (initializationRef.current) return;
    initializationRef.current = true;

    /* Load previous chats from API */
    const loadChats = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/chat`, {
          withCredentials: true,
          headers: getAuthHeaders(),
        });

        if (response.data.chats && response.data.chats.length > 0) {
          /* Map chats from DB format to component format */
          const formattedChats = response.data.chats.map((chat) => ({
            id: chat._id,
            title: chat.title || "New Chat",
            messages: [],
            createdAt: chat.createdAt,
          }));

          setPreviousChats(formattedChats);
          /* Load first chat - don't clear messages immediately */
          setCurrentChatId(formattedChats[0].id);
        } else {
          console.log("No chats found, creating new one...");
          /* No previous chats, create new one */
          handleNewChat();
        }
      } catch (err) {
        console.error("Error loading chats:", err);
        /* Fallback to creating new chat */
        handleNewChat();
      }
    };

    loadChats();
  }, []);

  // 🔹 Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🔹 Send Message (SOCKET ONLY)
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    if (!socketRef.current) {
      console.warn("⚠️ Socket not connected. Reconnecting...");
      return;
    }
    if (!currentChatId) {
      console.error("❌ No chat ID available");
      return;
    }

    const inputText = userInput.trim();

    const userMessage = {
      id: Date.now(),
      text: inputText,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setUserInput("");
    setLoading(true);

    console.log("📤 Emitting ai-message:", {
      chat: currentChatId,
      content: inputText,
    });
    socketRef.current.emit("ai-message", {
      content: inputText,
      chat: currentChatId, // must match backend
    });
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!currentChatId) {
      alert("Please select or create a chat before uploading an image.");
      event.target.value = null;
      return;
    }

    setLoading(true);

    const readAsDataURL = (fileToRead) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(fileToRead);
      });

    try {
      const dataUrl = await readAsDataURL(file);
      const imageBase64 = dataUrl?.toString().split(",")[1] || "";
      const fileType = file.type || "image/png";
      const caption = file.name;

      const userMessage = {
        id: Date.now(),
        text: `Uploaded image: ${file.name}`,
        sender: "user",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      const response = await axios.post(
        `${API_BASE_URL}/api/chat/image`,
        {
          chatId: currentChatId,
          imageBase64,
          imageType: fileType,
          caption,
        },
        {
          withCredentials: true,
          headers: getAuthHeaders(),
        },
      );

      const aiMessage = {
        id: Date.now() + 1,
        text: response.data.insights || response.data.message,
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Image upload failed:", error);
      const errorMessage = {
        id: Date.now(),
        text: `Failed to analyze image: ${error?.response?.data?.message || error.message}`,
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      event.target.value = null;
    }
  };

  // 🔹 New Chat with title prompt
  const handleNewChat = async () => {
    /* Prompt user for chat title */
    const chatTitle = prompt("Enter a title for this chat:", "New Chat");

    if (chatTitle === null) {
      /* User cancelled - don't create chat */
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/chat`,
        { title: chatTitle || "New Chat" },
        { withCredentials: true, headers: getAuthHeaders() },
      );

      const chatData = response.data?.chat;
      if (!chatData?._id) {
        throw new Error("Failed to create a new chat");
      }

      const newChat = {
        id: chatData._id,
        title: chatData.title || chatTitle || "New Chat",
        messages: [],
        createdAt: new Date(chatData.createdAt || Date.now()),
      };

      setCurrentChatId(newChat.id);
      setMessages([]);
      setPreviousChats((prev) => [newChat, ...prev]);
      setSidebarOpen(false);
    } catch (err) {
      console.error("Error creating chat:", err);
      alert("Unable to create a new chat. Please refresh and try again.");
    }
  };

  // 🔹 Select Chat
  const handleSelectChat = async (chatId) => {
    const chat = previousChats.find((c) => c.id === chatId);
    if (!chat) return;

    setCurrentChatId(chatId);

    /* Fetch messages for this chat from backend */
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/chat/${chatId}/messages`,
        {
          withCredentials: true,
          headers: getAuthHeaders(),
        },
      );

      /* Map messages to the format expected by ChatWindow */
      const formattedMessages = response.data.messages.map((msg) => ({
        id: msg._id,
        text: msg.content,
        sender: msg.role === "model" ? "ai" : "user",
        timestamp: new Date(msg.createdAt),
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      setMessages([]);
    }

    setSidebarOpen(false);
  };

  // 🔹 Delete Chat
  const handleDeleteChat = async (chatId) => {
    try {
      /* Delete chat from backend */
      await axios.delete(`${API_BASE_URL}/api/chat/${chatId}`, {
        withCredentials: true,
        headers: getAuthHeaders(),
      });

      /* Remove from frontend state */
      setPreviousChats((prev) => prev.filter((c) => c.id !== chatId));

      /* If deleting current chat, create a new one */
      if (chatId === currentChatId) {
        handleNewChat();
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
      alert("Failed to delete chat. Please try again.");
    }
  };

  return (
    <div className="home-container">
      {/* Sidebar Toggle */}
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        ☰
      </button>

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        previousChats={previousChats}
        currentChatId={currentChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
      />

      {/* Chat Window */}
      <ChatWindow
        messages={messages}
        userInput={userInput}
        loading={loading}
        onInputChange={(e) => setUserInput(e.target.value)}
        onSendMessage={handleSendMessage}
        onImageUpload={handleImageUpload}
        messagesEndRef={messagesEndRef}
      />
    </div>
  );
};

export default Home;
