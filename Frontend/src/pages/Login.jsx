import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/login`,
        { email, password },
        { withCredentials: true },
      );

      if (response.status === 200) {
        navigate("/home");
      }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Login failed. Please check your email and password.";
      setError(message);
      alert(message);
      console.error("Login error:", error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="brand-logo">
          Bodhi <span>AI</span>
        </div>
        <p className="subtitle">Sign in to continue</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <button className="btn-main" type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Login"}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
}
