import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import "./Home.css";
import { io } from "socket.io-client";
import axios from "axios";
const Home = () => {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [previousChats, setPreviousChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const initializationRef = useRef(false); // Prevent double initialization in StrictMode

  // 🔹 Socket setup
  useEffect(() => {
    const newSocket = io("http://localhost:8000", {
      withCredentials: true,
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to Socket.IO server");
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from Socket.IO server");
    });

    /* Error handling for socket connection */
    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setLoading(false);
    });

    // ✅ ONLY listen to AI response
    newSocket.on("ai-response", (message) => {
      const aiMessage = {
        id: Date.now(),
        text: message.content,
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setLoading(false); // Stop loading when AI responds
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
  }, [currentChatId]);

  // 🔹 Load previous chats on mount & prompt for title
  useEffect(() => {
    /* Prevent running twice in StrictMode */
    if (initializationRef.current) return;
    initializationRef.current = true;

    /* Load previous chats from API */
    const loadChats = async () => {
      try {
        const response = await axios.get("http://localhost:8000/api/chat", {
          withCredentials: true,
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
          /* Load first chat */
          setCurrentChatId(formattedChats[0].id);
          setMessages([]);
        } else {
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
    if (!userInput.trim() || !socket) return;

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

    socket.emit("ai-message", {
      content: inputText,
      chat: currentChatId, // must match backend
    });
  };

  // 🔹 New Chat with title prompt
  const handleNewChat = () => {
    /* Prompt user for chat title */
    const chatTitle = prompt("Enter a title for this chat:", "New Chat");

    if (chatTitle === null) {
      /* User cancelled - don't create chat */
      return;
    }

    const newChatId = Date.now().toString();

    axios
      .post(
        "http://localhost:8000/api/chat",
        {
          title: chatTitle || "New Chat",
        },
        {
          withCredentials: true,
        },
      )
      .then((res) => {
        const chatData = res.data?.chat || {};
        const title = chatData.title || chatTitle || "New Chat";

        const newChat = {
          id: chatData._id || newChatId,
          title,
          messages: [],
          createdAt: new Date(),
        };

        setCurrentChatId(newChat.id);
        setMessages([]);
        setPreviousChats((prev) => [newChat, ...prev]);
        setSidebarOpen(false);
      })
      .catch((err) => {
        console.error("Error creating chat:", err);

        const newChat = {
          id: newChatId,
          title: chatTitle || "New Chat",
          messages: [],
          createdAt: new Date(),
        };

        setCurrentChatId(newChatId);
        setMessages([]);
        setPreviousChats((prev) => [newChat, ...prev]);
        setSidebarOpen(false);
      });
  };

  // 🔹 Select Chat
  const handleSelectChat = async (chatId) => {
    const chat = previousChats.find((c) => c.id === chatId);
    if (!chat) return;

    setCurrentChatId(chatId);

    /* Fetch messages for this chat from backend */
    try {
      const response = await axios.get(
        `http://localhost:8000/api/chat/${chatId}/messages`,
        {
          withCredentials: true,
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
      await axios.delete(`http://localhost:8000/api/chat/${chatId}`, {
        withCredentials: true,
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
        messagesEndRef={messagesEndRef}
      />
    </div>
  );
};

export default Home;
