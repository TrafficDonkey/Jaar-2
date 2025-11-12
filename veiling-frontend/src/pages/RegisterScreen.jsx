// RegisterScreen.jsx
// Registratiescherm voor nieuwe gebruikers.
// Verstuurt een registratieverzoek naar de backend en leidt daarna door naar het login-scherm.

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./RegisterStyle.css";

const API = import.meta.env.VITE_API_BASE ?? "http://localhost:5146/api";

export default function RegisterScreen() {
  // ────────────────────────────── state ──────────────────────────────
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [role, setRole] = useState("Klant");
  const [showPw, setShowPw] = useState(false);
  const [caps, setCaps] = useState(false);
  const [msg, setMsg] = useState("");
  const nav = useNavigate();

  // Prefill e-mail uit localStorage (laatste gebruikte e-mailadres)
  useEffect(() => {
    const last = localStorage.getItem("lastEmail");
    if (last) setEmail(last);
  }, []);

  // ────────────────────────────── submit ──────────────────────────────
  // Verwerk registratie: POST /auth/register en stuur door naar login bij succes
  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("Registreren…");
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naam: naam.trim(),
          email: email.trim(),
          password: pw,
          rol: role
        })
      });
      const text = await res.text();
      if (!res.ok) {
        setMsg(`❌ ${res.status} ${res.statusText} — ${text || "Kan niet registreren"}`);
        return;
      }
      localStorage.setItem("lastEmail", email.trim());
      setMsg("✅ Gelukt! Doorsturen naar login…");
      setTimeout(() => nav("/login", { replace: true }), 800);
    } catch (err) {
      setMsg(`❌ Netwerkfout: ${err.message ?? err}`);
    }
  }

  // ────────────────────────────── weergave ──────────────────────────────
  return (
    <div className="page-shell reg-shell">
      <a href="#main" className="skip-link">Ga naar hoofdinhoud</a>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">🌿</span>
          <span className="brand-name">FloraFlow</span>
        </div>
        <Link to="/login" className="topbar-link">Inloggen</Link>
      </header>

      <main id="main" className="reg-main">
        <section className="auth-panel" aria-labelledby="reg-title">
            <h1 id="reg-title">Account aanmaken</h1>
            <p className="panel-subtitle">Kies je rol en vul je gegevens in.</p>

            {/* Registratieformulier */}
            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              <div className="field">
                <label htmlFor="naam">Naam</label>
                <input id="naam" value={naam} onChange={e => setNaam(e.target.value)} required />
              </div>

              <div className="field">
                <label htmlFor="reg-email">E-mailadres</label>
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="field password-field">
                <label htmlFor="reg-password">Wachtwoord</label>
                <input
                  id="reg-password"
                  type={showPw ? "text" : "password"}
                  value={pw}
                  onChange={e => setPw(e.target.value)}
                  onKeyUp={e => setCaps(e.getModifierState && e.getModifierState("CapsLock"))}
                  required
                />
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => setShowPw(s => !s)}
                >
                  {showPw ? "Verberg" : "Toon"}
                </button>
                {caps && <p className="caps-hint">⚠️ Caps Lock staat aan</p>}
              </div>

              {/* Rolkeuze (bepaalt toegankelijke schermen) */}
              <fieldset className="field">
                <legend>Rol</legend>
                <p className="role-hint">Je rol bepaalt welke schermen je ziet.</p>

                <label className="role-line">
                  <input
                    type="radio"
                    name="rol"
                    value="Klant"
                    checked={role === "Klant"}
                    onChange={e => setRole(e.target.value)}
                  />
                  <span>Klant</span>
                </label>

                <label className="role-line">
                  <input
                    type="radio"
                    name="rol"
                    value="Aanvoerder"
                    checked={role === "Aanvoerder"}
                    onChange={e => setRole(e.target.value)}
                  />
                  <span>Aanvoerder</span>
                </label>

                <label className="role-line">
                  <input
                    type="radio"
                    name="rol"
                    value="Veilingmeester"
                    checked={role === "Veilingmeester"}
                    onChange={e => setRole(e.target.value)}
                  />
                  <span>Veilingmeester</span>
                </label>
              </fieldset>

              <button type="submit" className="primary-btn">Account maken</button>

              <div className="auth-alt" role="note" aria-live="polite">
                Heb je al een account?{" "}
                <Link to="/login" className="link-btn">Inloggen</Link>
              </div>

              <p className="form-msg" aria-live="polite">{msg}</p>
            </form>
        </section>
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} FloraFlow — demo</p>
      </footer>
    </div>
  );
}
