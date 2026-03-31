import React from "react";
import "./Sidebar.css";

const Sidebar = ({
  isOpen,
  previousChats,
  currentChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
}) => {
  return (
    <div className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        <button className="new-chat-btn" onClick={onNewChat}>
          + New Chat
        </button>
      </div>

      <div className="chat-list">
        {previousChats.length === 0 ? (
          <div className="empty-state">No chats yet</div>
        ) : (
          previousChats.map((chat) => (
            <div
              key={chat.id}
              className={`chat-item ${
                currentChatId === chat.id ? "active" : ""
              }`}
              onClick={() => onSelectChat(chat.id)}
            >
              <div className="chat-item-content">
                <p className="chat-title">{chat.title}</p>
                <span className="chat-date">
                  {new Date(chat.createdAt).toLocaleDateString()}
                </span>
              </div>
              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat.id);
                }}
                aria-label="Delete chat"
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <p>Made with ❤️</p>
      </div>
    </div>
  );
};

export default Sidebar;
