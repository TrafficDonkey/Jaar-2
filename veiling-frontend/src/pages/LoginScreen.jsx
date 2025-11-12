// LoginScreen.jsx
// Inlogscherm voor de applicatie.
// Verstuurt een login-verzoek naar de backend, bewaart het JWT-token en navigeert door naar de beveiligde app.

import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation} from "react-router-dom";
import "./LoginStyle.css";

const API = import.meta.env.VITE_API_BASE ?? "http://localhost:5146/api";

export default function LoginScreen() {
  // ────────────────────────────── state ──────────────────────────────
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [caps, setCaps] = useState(false);
  const [msg, setMsg] = useState("");
  const nav = useNavigate();
  const location = useLocation();

  // Prefill e-mail uit localStorage (laatste gebruikte e-mailadres)
  useEffect(() => {
    const last = localStorage.getItem("lastEmail");
    if (last) setEmail(last);
  }, []);

  // ────────────────────────────── submit ──────────────────────────────
  // Verwerk inloggen: POST /auth/login, controleer token, sla op, navigeer door
  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("Inloggen…");

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // credentials: "include", // niet nodig bij JWT in Authorization header
        body: JSON.stringify({ email: email.trim(), password: pw })
      });

      const text = await res.text();
      if (!res.ok) {
        setMsg(`❌ ${res.status} ${res.statusText} — ${text || "Onjuiste inloggegevens"}`);
        return;
      }

      localStorage.setItem("lastEmail", email.trim());

      let data = {};
      try { data = JSON.parse(text || "{}"); } catch {}

      // Vereis een token van de server
      if (!data.token) {
        setMsg("❌ Geen token ontvangen van de server");
        return;
      }

      localStorage.setItem("token", data.token);
      if (data.role) localStorage.setItem("role", data.role);

      setMsg("✅ Ingelogd!");

      // Redirect: ga terug naar de gewenste pagina of naar /app
      const to = (location.state && location.state.from?.pathname) || "/app";
      nav(to, { replace: true });

    } catch (err) {
      setMsg(`❌ Netwerkfout: ${err.message ?? err}`);
    }
  }

  // ────────────────────────────── weergave ──────────────────────────────
  return (
    <div className="page-shell login-shell">
      <a href="#main" className="skip-link">Ga naar hoofdinhoud</a>

      {/* Bovenbalk met merk en link naar registratie */}
      <header className="topbar" aria-label="Hoofdnavigatie">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">🌿</span>
          <span className="brand-name">FloraFlow</span>
        </div>
        <Link to="/register" className="topbar-link">Account aanmaken</Link>
      </header>

      {/* Hoofdsectie met inlogformulier */}
      <main id="main" className="login-main" aria-labelledby="login-title">
        <section className="auth-panel" aria-describedby="login-sub">
          <h1 id="login-title">Inloggen</h1>
          <p id="login-sub" className="panel-subtitle">
            Meld je aan om kavels te veilen of te kopen.
          </p>

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="field">
              <label htmlFor="email">E-mailadres</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field password-field">
              <label htmlFor="password">Wachtwoord</label>
              <input
                id="password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                value={pw}
                onChange={e => setPw(e.target.value)}
                onKeyUp={e =>
                  setCaps(e.getModifierState && e.getModifierState("CapsLock"))
                }
                required
              />
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setShowPw(s => !s)}
                aria-pressed={showPw}
              >
                {showPw ? "Verberg" : "Toon"}
              </button>
              {caps && <p className="caps-hint">⚠️ Caps Lock staat aan</p>}
            </div>

            <button type="submit" className="primary-btn">
              Inloggen
            </button>

            <p className="form-msg" aria-live="polite">{msg}</p>
          </form>

          <p className="alt-link">
            Nog geen account? <Link to="/register">Registreer</Link>
          </p>
        </section>
      </main>

      {/* Footer met jaartal (demo) */}
      <footer className="footer">
        <p>© {new Date().getFullYear()} FloraFlow — demo</p>
      </footer>
    </div>
  );
}
