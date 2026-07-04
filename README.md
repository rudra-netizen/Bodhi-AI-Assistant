# 🚀 Bodhi AI Assistant

An AI-powered full-stack chat application built using the MERN stack with real-time communication, authentication, and cloud deployment.

---

## 🌟 Overview

Bodhi AI Assistant is a ChatGPT-like application that allows users to interact with an AI model in real time. It supports authentication, protected APIs, and persistent chat handling.

---

## 🧠 Features

- 💬 Real-time AI chat
- 🔐 Google OAuth Authentication (Sign up with Gmail)
- 🔒 Secure custom password setup
- 🧾 Chat history storage (MongoDB)
- ⚡ Fast and scalable backend
- 🔒 Protected API routes with JWT
- 🌐 Deployed on Render
- 🔌 Socket-based real-time communication
- 🤖 AI integration (Gemini API)
- 📚 Integrated Pinecone Vector Database for memory

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

### Backend (.env)

```
PORT=3001
MONGO_URI=your_mongodb_uri
JWT_SECRET_KEY=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GEMINI_API_KEY=your_gemini_key
PINECONE_API_KEY=your_pinecone_key
```

### Frontend (.env)

```
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
VITE_API_BASE_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

**Note**: Visit [OAUTH_SETUP.md](./OAUTH_SETUP.md) for detailed Google OAuth configuration.

---

## 🚀 Getting Started

### 1. Clone Repo

git clone https://github.com/rudra-netizen/Bodhi-AI-Assistant.git

---

### 2. Backend Setup

cd backend
npm install
npx nodemon server.js

---

### 3. Frontend Setup

cd frontend
npm install
npm run dev

---

## 🌐 Live Demo

Backend Live URL:  
https://bodhi-ai-assistant.onrender.com/login

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
