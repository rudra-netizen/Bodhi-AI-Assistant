# 🚀 Bodhi AI Assistant

An AI-powered full-stack chat application built using the MERN stack with real-time communication, authentication, and cloud deployment.

---

## 🌟 Overview

Bodhi AI Assistant is a ChatGPT-like application that allows users to interact with an AI model in real time. It supports authentication, protected APIs, and persistent chat handling.

---

## 🧠 Features

- 💬 Real-time AI chat
- 🔐 User Authentication (Login / Signup)
- 🧾 Chat history storage (MongoDB)
- ⚡ Fast and scalable backend
- 🔒 Protected API routes
- 🌐 Deployed on Render
- 🔌 Socket-based real-time communication
- 🧠 AI integration (LLM)
- ⚡ Integrated Pinecone Vector Database

---

## 🏗️ Tech Stack

### Frontend

- React.js
- Axios
- CSS / Tailwind

### Backend

- Node.js
- Express.js
- MongoDB (Mongoose)
- Socket.io
- PineCone (Vector Database)

### AI

- GEMINI API

---

## ⚙️ Environment Variables

Create a `.env` file inside backend folder:

PORT=3000
MONGO_URI=your_mongodb_uri
OPENAI_API_KEY=your_openai_key
PINECONE_API_KEY=your_key
JWT_SECRET=your_secret

---

## 🚀 Getting Started

### 1. Clone Repo

git clone https://github.com/rudra-netizen/Bodhi-AI-Assistant.git

---

### 2. Backend Setup

cd backend
npm install
npm start

---

### 3. Frontend Setup

cd frontend
npm install
npm run dev

---

## 🌐 Live Demo

Backend Live URL:  
https://bodhi-ai-assistant.onrender.com

API Example:  
`/api/chat`

---

## 🔐 API Security

Protected routes require authentication.

---

## 📡 API Endpoints

### Auth

- POST `/api/auth/register`
- POST `/api/auth/login`

### Chat

- POST `/api/chat` (Protected)

---

## 🧪 Testing

Use Postman:

- Add token in headers
- Send JSON body
- Receive AI response

---

## 📈 Future Improvements

- RAG (Retrieval-Augmented Generation)
- Chat memory
- Streaming responses
- Mobile UI
- Multi-language support

---

## 👨‍💻 Author

Rudraksh Tiwari

---

## 📜 License

MIT License

---

## ⭐ Support

If you like this project:

- Star ⭐ the repo
- Fork 🍴 it
