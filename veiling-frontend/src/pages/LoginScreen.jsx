// LoginScreen.jsx
// Pagina voor inloggen. Stuurt credentials naar de backend en slaat het JWT-token op.
// Haalt rol en gebruikerId uit het token en stuurt de gebruiker daarna naar de juiste app-route.

import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./LoginStyle.css";

const API = import.meta.env.VITE_API_BASE ?? "http://localhost:5146/api";

// Hulpfunctie: parseer een JWT-token en geef de payload terug
function parseJwt(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payloadJson = atob(parts[1]);
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

// Hulpfunctie: haal rol en gebruikerId uit de token-payload
function getAuthInfoFromToken(token) {
  const payload = parseJwt(token);
  if (!payload) return { role: null, gebruikerId: null };

  const role =
    payload.role ||
    payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
    null;

  const gebruikerIdRaw =
    payload.nameid ||
    payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
    null;

  const gebruikerId = gebruikerIdRaw ? Number(gebruikerIdRaw) : null;

  return { role, gebruikerId };
}

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [caps, setCaps] = useState(false);
  const [msg, setMsg] = useState("");
  const nav = useNavigate();
  const location = useLocation();

  // Vooraf e-mailadres invullen met laatst gebruikte adres
  useEffect(() => {
    const last = localStorage.getItem("lastEmail");
    if (last) setEmail(last);
    document.title = "Login";
  }, []);

  // Formulier versturen
  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("Inloggen…");

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: pw })
      });

      const text = await res.text();
      if (!res.ok) {
        setMsg(
          `❌ ${res.status} ${res.statusText} — ${
            text || "Onjuiste inloggegevens"
          }`
        );
        return;
      }

      // Bewaar laatst gebruikte e-mailadres
      localStorage.setItem("lastEmail", email.trim());

      let data = {};
      try {
        data = JSON.parse(text || "{}");
      } catch {
        data = {};
      }

      // Token is verplicht
      if (!data.token) {
        setMsg("❌ Geen token ontvangen van de server");
        return;
      }

      // Sla token op
      localStorage.setItem("token", data.token);

      // Haal rol + gebruikerId uit token (of uit response als die er nog in zit)
      const fromToken = getAuthInfoFromToken(data.token);
      const finalRole = data.role || fromToken.role || "";
      const finalGebruikerId =
        data.gebruikerId ?? fromToken.gebruikerId ?? null;

      if (finalRole) {
        localStorage.setItem("role", finalRole);
      }
      if (finalGebruikerId != null) {
        localStorage.setItem("gebruikerId", String(finalGebruikerId));
      }

      setMsg("✅ Ingelogd!");

      // Standaard doel-URL op basis van rol
      let defaultTarget = "/app";
      if (finalRole === "Aanvoerder") {
        defaultTarget = "/app/aanvoerder";
      }

      // Als gebruiker via ProtectedRoute kwam → terug naar die pagina
      const from = location.state?.from?.pathname;
      const to =
        from && from !== "/login" && from !== "/" ? from : defaultTarget;

      nav(to, { replace: true });
    } catch (err) {
      setMsg(`❌ Netwerkfout: ${err.message ?? err}`);
    }
  }

  return (
    <div className="page-shell login-shell">
      <a href="#main" className="skip-link">
        Ga naar hoofdinhoud
      </a>

      {/* Bovenbalk met merk en link naar registratie */}
      <header className="topbar" aria-label="Hoofdnavigatie">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            🌿
          </span>
          <span className="brand-name">FloraFlow</span>
        </div>
        <Link to="/register" className="topbar-link">
          Account aanmaken
        </Link>
      </header>

      {/* Hoofdinhoud: loginformulier */}
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
                onChange={(e) => setEmail(e.target.value)}
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
                onChange={(e) => setPw(e.target.value)}
                onKeyUp={(e) =>
                  setCaps(
                    e.getModifierState && e.getModifierState("CapsLock")
                  )
                }
                required
              />
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setShowPw((s) => !s)}
                aria-pressed={showPw}
              >
                {showPw ? "Verberg" : "Toon"}
              </button>
              {caps && <p className="caps-hint">⚠️ Caps Lock staat aan</p>}
            </div>

            <button type="submit" className="primary-btn">
              Inloggen
            </button>

            <p className="form-msg" aria-live="polite">
              {msg}
            </p>
          </form>

          <p className="alt-link">
            Nog geen account? <Link to="/register">Registreer</Link>
          </p>
        </section>
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} FloraFlow — demo</p>
      </footer>
    </div>
  );
}
