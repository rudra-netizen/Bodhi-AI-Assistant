import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await axios.post(
        "https://bodhi-ai-assistant.onrender.com/api/auth/login",
        form,
        {
          withCredentials: true,
        },
      );

      /* Login successful - navigate to home */
      if (response.status === 200) {
        navigate("/home");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert(error.response?.data?.message || "Login failed. Please try again.");
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

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <button className="btn-main">
            {submitting ? "Signing in..." : "Login"}
          </button>
        </form>

        <div className="auth-footer">
          New here? <Link to="/register">Create account</Link>
        </div>
      </div>
    </div>
  );
}

/*  <div className="auth-wrapper">
  <div className="auth-card">

    <div className="brand-logo">Bodhi <span>AI</span></div>
    <p className="subtitle">Sign in to continue</p>

    <form onSubmit={handleSubmit}>
      <div className="field">
        <label>Email</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
        />
      </div>

      <div className="field">
        <label>Password</label>
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          required
        />
      </div>

      <button className="btn-main">
        {submitting ? "Signing in..." : "Login"}
      </button>
    </form>

    <div className="auth-footer">
      New here? <Link to="/register">Create account</Link>
    </div>

  </div>
</div>*/
