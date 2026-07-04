import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function Register() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [credentialToken, setCredentialToken] = useState(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const navigate = useNavigate();

  async function handleGoogleSuccess(credentialResponse) {
    setError("");
    setCredentialToken(credentialResponse.credential);
    setShowPasswordForm(true);
  }

  function handleGoogleError() {
    setError("Google signup failed. Please try again.");
  }

  async function handleSubmitPassword(e) {
    e.preventDefault();
    setError("");

    // Validate password
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/google`,
        {
          token: credentialToken,
          password: password,
          action: "signup",
        },
        {
          withCredentials: true,
        },
      );

      if (response.status === 201) {
        alert("Account created successfully! Please login.");
        navigate("/login");
      }
    } catch (error) {
      console.error("Registration error:", error);
      setError(
        error.response?.data?.message ||
          "Registration failed. Please try again.",
      );
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
        <p className="subtitle">
          {showPasswordForm ? "Set your password" : "Create your account"}
        </p>

        {error && <div className="error-message">{error}</div>}

        {!showPasswordForm ? (
          <div className="oauth-section">
            <p className="hint-text">Sign up with your Gmail account</p>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmitPassword}>
            <div className="field">
              <label>Create Password</label>
              <input
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="field">
              <label>Confirm Password</label>
              <input
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <button className="btn-main" type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Account"}
            </button>

            <button
              type="button"
              className="btn-back"
              onClick={() => {
                setShowPasswordForm(false);
                setCredentialToken(null);
                setPassword("");
                setConfirmPassword("");
              }}
              disabled={submitting}
            >
              Back
            </button>
          </form>
        )}

        <div className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
}
