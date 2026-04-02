import React from "react";
import { Link } from "react-router-dom";
import "./Welcome.css";

export default function Welcome() {
  return (
    <main className="welcome-page">
      <div className="welcome-frame"></div>
      <div className="welcome-content">
        <section className="hero-copy">
          <span className="eyebrow">Welcome to Bodhi AI</span>
          <h1>Smarter conversations. Bold outcomes.</h1>
          <p>
            Discover an elegant AI assistant with a polished 3D welcome
            experience. Login or sign up to start your next intelligent chat
            session.
          </p>
          <div className="hero-actions">
            <Link to="/login" className="btn btn-primary">
              Login
            </Link>
            <Link to="/register" className="btn btn-secondary">
              Sign Up
            </Link>
          </div>
        </section>

        <section className="hero-visual">
          <div className="scene">
            <div className="card">
              <div className="card__face card__face--front">
                <div className="card__title">BODHI</div>
                <div className="card__subtitle">AI Assistant</div>
              </div>
              <div className="card__face card__face--side">
                <span>Chat</span>
              </div>
              <div className="card__face card__face--top" />
            </div>
          </div>
          <div className="glow-ring" />
          <div className="glow-dot glow-dot--a" />
          <div className="glow-dot glow-dot--b" />
        </section>
      </div>
    </main>
  );
}
