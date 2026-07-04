import React from "react";
import { Link } from "react-router-dom";

const features = [
  {
    title: "Smart Conversations",
    description:
      "Interact with Bodhi AI using intelligent prompts and get fast, contextual responses.",
  },
  {
    title: "Secure Gmail Login",
    description:
      "Signup using your Gmail account and protect it with a strong password.",
  },
  {
    title: "Persistent Chat Memory",
    description: "Keep your chat history and maintain context across sessions.",
  },
  {
    title: "Modern Real-time UI",
    description:
      "Experience seamless real-time messaging with a clean and responsive interface.",
  },
];

export default function Landing() {
  return (
    <div className="landing-page">
      <div className="landing-overlay" />
      <div className="landing-content">
        <header className="landing-header">
          <div>
            <span className="brand-pill">Bodhi AI</span>
            <h1>Build smarter chat experiences with next-gen AI.</h1>
            <p className="landing-subtitle">
              Unlock natural conversations, secure login, and persistent memory
              in a sleek AI assistant UI.
            </p>
          </div>

          <div className="landing-actions">
            <Link className="btn-hero" to="/register">
              Start with Gmail
            </Link>
            <Link className="btn-secondary" to="/login">
              Already have an account?
            </Link>
          </div>
        </header>

        <section className="feature-grid">
          {features.map((feature) => (
            <article key={feature.title} className="feature-card">
              <div className="feature-icon">✓</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
