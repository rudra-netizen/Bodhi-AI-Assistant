import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";

export default function Register() {
  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
  });

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
        "http://localhost:8000/api/auth/register",
        {
          fullname: {
            firstname: form.firstname,
            lastname: form.lastname,
          },
          email: form.email,
          password: form.password,
        },
        { withCredentials: true },
      );

      /* Registration successful - navigate to login */
      if (response.status === 201) {
        alert("Account created! Please login.");
        navigate("/login");
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert(
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
        <p className="subtitle">Create your account</p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>First name</label>
            <input
              name="firstname"
              value={form.firstname}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field">
            <label>Last name</label>
            <input
              name="lastname"
              value={form.lastname}
              onChange={handleChange}
              required
            />
          </div>

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
            {submitting ? "Creating..." : "Register"}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
}
