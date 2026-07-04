# 🔐 Google OAuth Setup Guide

## Overview

Bodhi AI Assistant now uses Google OAuth for authentication. Users sign up with their Gmail account and set a custom password for login.

---

## 🚀 Setup Steps

### 1️⃣ Backend Setup

#### Install Dependencies

```bash
cd Backend
npm install
```

#### Configure Environment Variables

Create a `.env` file in the `Backend` folder:

```env
PORT=3001
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
JWT_SECRET_KEY=your_super_secret_jwt_key_12345
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GEMINI_API_KEY=your_gemini_api_key
PINECONE_API_KEY=your_pinecone_api_key
```

#### Get Google Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project named "Bodhi AI"
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web
   - Authorized redirect URIs:
     - `http://localhost:5173`
     - `http://localhost:5174`
     - `https://your-frontend-domain.com` (production)
   - Copy the Client ID
5. Put the Client ID in your `.env` as `GOOGLE_CLIENT_ID`

### 2️⃣ Frontend Setup

#### Install Dependencies

```bash
cd Frontend
npm install
```

#### Configure Environment Variables

Create a `.env` file in the `Frontend` folder:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
VITE_API_BASE_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

For production, update the URLs:

```env
VITE_API_BASE_URL=https://bodhi-ai-assistant.onrender.com
VITE_SOCKET_URL=https://bodhi-ai-assistant.onrender.com
```

---

## 🔄 Authentication Flow

### Sign Up Flow

1. User clicks "Google" button on Register page
2. Google OAuth popup appears
3. User selects/logs in with Gmail account
4. Frontend receives Google token
5. User sets a password (min 6 characters)
6. Frontend sends token + password + action="signup" to backend
7. Backend verifies token with Google
8. Backend creates user with:
   - Email from Google
   - First Name & Last Name from Google
   - Password (hashed)
   - googleId (stored for reference)
   - provider: "google"
9. Backend creates JWT token and sets httpOnly cookie
10. User redirected to Login page

### Login Flow

1. User clicks "Google" button on Login page
2. Google OAuth popup appears
3. User selects Gmail account
4. Frontend receives Google token
5. User enters the password they set during signup
6. Frontend sends token + password + action="login" to backend
7. Backend verifies token with Google
8. Backend checks if user exists
9. Backend verifies password matches
10. Backend creates JWT token and sets httpOnly cookie
11. User redirected to Home page

---

## 📋 API Endpoints

### Google Auth Endpoint

```
POST /api/auth/google
```

**Request:**

```json
{
  "token": "google_id_token_from_frontend",
  "password": "user_password",
  "action": "signup" | "login"
}
```

**Response (Success):**

```json
{
  "message": "Account created/logged in successfully",
  "user": {
    "_id": "user_id",
    "email": "user@gmail.com",
    "fullname": {
      "firstname": "John",
      "lastname": "Doe"
    }
  }
}
```

**Response (Error):**

```json
{
  "message": "Error description",
  "error": "error_details"
}
```

---

## 🗄️ Database Changes

### User Model Updates

```javascript
{
  email: String (unique, required),
  fullname: {
    firstname: String,
    lastname: String
  },
  password: String (optional for OAuth users),
  googleId: String (optional, unique),
  provider: "local" | "google",
  createdAt: Date,
  updatedAt: Date
}
```

---

## ⚠️ Important Notes

1. **Password Requirement**: Users must set a password during signup, even with Google OAuth
2. **Email Uniqueness**: Each email can only have one account
3. **Provider Matching**: Users who signed up with Google must log in with Google (and password)
4. **Token Validation**: All Google tokens are verified with Google servers before creating/updating user
5. **httpOnly Cookies**: JWT tokens are stored in httpOnly cookies for security

---

## 🧪 Testing

### Local Testing

1. Start backend: `npm run dev`
2. Start frontend: `npm run dev`
3. Navigate to `http://localhost:5173`
4. Test signup with any valid Gmail account
5. Test login with the same Gmail account and password

### Production Testing

1. Ensure Google Credentials are added to production environment variables
2. Update frontend `.env` with production URLs
3. Build and deploy both frontend and backend
4. Test OAuth flow on production domain

---

## 🔗 Environment Variables Summary

### Backend

- `GOOGLE_CLIENT_ID`: Google OAuth Client ID
- `JWT_SECRET_KEY`: Secret for JWT signing
- `MONGO_URI`: MongoDB connection string
- `PORT`: Server port
- `GEMINI_API_KEY`: Gemini API key
- `PINECONE_API_KEY`: Pinecone API key

### Frontend

- `VITE_GOOGLE_CLIENT_ID`: Google OAuth Client ID (same as backend)
- `VITE_API_BASE_URL`: Backend API base URL
- `VITE_SOCKET_URL`: Socket.IO server URL

---

## ✨ Features

✅ Sign up with Gmail  
✅ Set custom password during signup  
✅ Login with Gmail and password  
✅ Secure JWT token management  
✅ HttpOnly cookie storage  
✅ Google token verification  
✅ User data from Google account  
✅ Traditional login still supported (backward compatible)

---

## 🐛 Troubleshooting

### "Invalid token or authentication failed"

- Ensure `GOOGLE_CLIENT_ID` matches between backend and frontend
- Check token hasn't expired
- Verify Client ID in Google Console has correct domains

### "Email already registered"

- User already has an account with this email
- Ask user to login instead

### "Please sign in with Google"

- User was registered with OAuth
- They must login with Google

### "This email is registered with traditional login"

- User signed up with old method
- They must use password login (not OAuth)

---

## 📝 Migration from Old Auth System

If you had users registered with the old system:

1. They can still login with their email and password
2. New users must use Google OAuth
3. Optionally migrate old users to new system (manual script needed)

---

## 🎯 Next Steps

1. Get Google Credentials from Google Cloud Console
2. Add credentials to `.env` files
3. Install dependencies: `npm install`
4. Start development servers
5. Test OAuth flow
6. Deploy to production

---

For more help, refer to the [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2).
