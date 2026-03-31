import React from "react";
import "./ChatWindow.css";

const renderMessageContent = (text) => {
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  const nodes = [];
  let paragraphLines = [];
  let listItems = [];
  let listType = null;

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    nodes.push(
      <p key={`paragraph-${nodes.length}`}>{paragraphLines.join("\n")}</p>,
    );
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    nodes.push(
      listType === "ordered" ? (
        <ol key={`list-${nodes.length}`}>
          {listItems.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ol>
      ) : (
        <ul key={`list-${nodes.length}`}>
          {listItems.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ),
    );
    listItems = [];
    listType = null;
  };

  lines.forEach((line) => {
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)/);
    const orderedMatch = line.match(/^\s*(\d+)[.)]\s+(.*)/);

    if (bulletMatch) {
      flushParagraph();
      if (listType !== "bullet") flushList();
      listType = "bullet";
      listItems.push(bulletMatch[1]);
    } else if (orderedMatch) {
      flushParagraph();
      if (listType !== "ordered") flushList();
      listType = "ordered";
      listItems.push(orderedMatch[2]);
    } else if (line.trim() === "") {
      flushParagraph();
      flushList();
    } else {
      if (listItems.length) flushList();
      paragraphLines.push(line);
    }
  });

  flushParagraph();
  flushList();
  return nodes;
};

const ChatWindow = ({
  messages,
  userInput,
  loading,
  onInputChange,
  onSendMessage,
  messagesEndRef,
}) => {
  return (
    <div className="chat-window">
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <h2>Start a conversation</h2>
            <p>Ask me anything and I'll help you out!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.sender}-message`}
            >
              <div className="message-avatar">
                {message.sender === "user" ? "👤" : "🤖"}
              </div>
              <div className="message-content">
                {renderMessageContent(message.text)}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="message ai-message loading">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="input-form" onSubmit={onSendMessage}>
        <div className="input-wrapper">
          <input
            type="text"
            placeholder="Type your message..."
            value={userInput}
            onChange={onInputChange}
            disabled={loading}
            className="message-input"
          />
          <button
            type="submit"
            disabled={loading || !userInput.trim()}
            className="send-btn"
            aria-label="Send message"
          >
            ➤
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;
