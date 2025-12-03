// src/pages/RegisterScreen.jsx
// Registratie-scherm. Nieuwe gebruikers krijgen altijd rol "Klant".
// Andere rollen (Aanvoerder / Veilingmeester / Admin) worden door een beheerder toegekend.

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./RegisterStyle.css";

const API = import.meta.env.VITE_API_BASE ?? "http://localhost:5146/api";

export default function RegisterScreen() {
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [caps, setCaps] = useState(false);
  const [msg, setMsg] = useState("");
  const nav = useNavigate();

  // rol is altijd "Klant" (niet zichtbaar in de UI)
  const [role] = useState("Klant");

  useEffect(() => {
    document.title = "FloraFlow — Account aanmaken";
    const last = localStorage.getItem("lastEmail");
    if (last) setEmail(last);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");

    if (pw !== pw2) {
      setMsg("❌ Wachtwoorden komen niet overeen.");
      return;
    }

    setMsg("Registreren…");
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naam: naam.trim(),
          email: email.trim(),
          password: pw,
          rol: role // wordt in backend alsnog als 'Klant' gebruikt
        })
      });

      const text = await res.text();
      if (!res.ok) {
        setMsg(
          `❌ ${res.status} ${res.statusText} — ${
            text || "Kan niet registreren"
          }`
        );
        return;
      }

      localStorage.setItem("lastEmail", email.trim());
      setMsg("✅ Gelukt! Doorsturen naar login…");
      setTimeout(() => nav("/login", { replace: true }), 800);
    } catch (err) {
      setMsg(`❌ Netwerkfout: ${err.message ?? err}`);
    }
  }

  return (
    <div className="page-shell reg-shell">
      <a href="#main" className="skip-link">
        Ga naar hoofdinhoud
      </a>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            🌿
          </span>
          <span className="brand-name">FloraFlow</span>
        </div>
        <Link to="/login" className="topbar-link">
          Inloggen
        </Link>
      </header>

      <main id="main" className="reg-main">
        <section className="auth-panel" aria-labelledby="reg-title">
          <h1 id="reg-title">Account aanmaken</h1>
          <p className="panel-subtitle">
            Vul je gegevens in. Je account krijgt standaard de rol
            {" "}
            <strong>Klant</strong>. Extra rechten worden door een beheerder
            toegekend.
          </p>

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="field">
              <label htmlFor="naam">Naam</label>
              <input
                id="naam"
                placeholder="Bijv. Jan de Kweker"
                value={naam}
                onChange={(e) => setNaam(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="reg-email">E-mailadres</label>
              <input
                id="reg-email"
                type="email"
                placeholder="naam@bedrijf.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field password-field">
              <label htmlFor="reg-password">Wachtwoord</label>
              <input
                id="reg-password"
                type={showPw ? "text" : "password"}
                placeholder="Minimaal 8 tekens, combinatie van letters en cijfers"
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
              >
                {showPw ? "Verberg" : "Toon"}
              </button>
              {caps && (
                <p className="caps-hint">⚠️ Caps Lock staat aan</p>
              )}
            </div>

            <div className="field">
              <label htmlFor="reg-password2">Herhaal wachtwoord</label>
              <input
                id="reg-password2"
                type={showPw ? "text" : "password"}
                placeholder="Voer je wachtwoord nogmaals in"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="primary-btn">
              Account maken
            </button>

            <div className="auth-alt" role="note" aria-live="polite">
              Heb je al een account?{" "}
              <Link to="/login" className="link-btn">
                Inloggen
              </Link>
            </div>

            <p className="form-msg" aria-live="polite">
              {msg}
            </p>
          </form>
        </section>
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} FloraFlow — demo</p>
      </footer>
    </div>
  );
}
