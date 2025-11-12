// SettingsPage.jsx
// Instellingenpagina voor profiel-, locatie- en weergave-instellingen.
// Beheert o.a. naam, e-mail, voorkeurslocatie en (persistente) donkere modus via localStorage.

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./SettingsPageStyle.css";

const API = import.meta.env.VITE_API_BASE ?? "http://localhost:5146/api";

export default function SettingsPage() {
  // ────────────────────────────── state ──────────────────────────────
  const [naam, setNaam] = useState("Abel Demo");
  const [email, setEmail] = useState("abel@example.com");
  const [loc, setLoc] = useState("Naaldwijk");
  const [msg, setMsg] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  // ────────────────────────────── init donkere modus ──────────────────────────────
  // Lees dark mode-voorkeur uit localStorage bij het laden en pas <html>.dark toe
  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved === "true") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  // Pas donkere modus toe en sla voorkeur op
  function applyDarkMode(next) {
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("darkMode", "true");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("darkMode", "false");
    }
  }

  // ────────────────────────────── opslaan ──────────────────────────────
  // Demo-opslag: toont bevestiging; hier zou een PATCH naar backend kunnen komen
  async function handleSave(e) {
    e.preventDefault();
    // hier kun je PATCH naar je backend doen
    setMsg("Instellingen opgeslagen.");
    setTimeout(() => setMsg(""), 3000);
  }

  // ────────────────────────────── weergave ──────────────────────────────
  return (
    <div className="page-shell settings-shell">
      <a href="#main" className="skip-link">Ga naar hoofdinhoud</a>

      <main id="main" className="settings-main" aria-labelledby="settings-title">
        <section className="settings-panel">
          <h1 id="settings-title">Instellingen</h1>
          <p className="panel-subtitle">Beheer je profiel, locatie en weergave.</p>

          {/* Instellingenformulier */}
          <form onSubmit={handleSave} className="settings-form" noValidate>
            <div className="field">
              <label htmlFor="naam">Naam</label>
              <input
                id="naam"
                value={naam}
                onChange={e => setNaam(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="email">E-mailadres</label>
              <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              />
            </div>

            <div className="field">
              <label htmlFor="loc">Voorkeurs kloklocatie</label>
              <select id="loc" value={loc} onChange={e => setLoc(e.target.value)}>
                <option value="Naaldwijk">Naaldwijk</option>
                <option value="Aalsmeer">Aalsmeer</option>
                <option value="Rijnsburg">Rijnsburg</option>
                <option value="Eelde">Eelde</option>
              </select>
            </div>

            {/* Donkere modus toggle met visuele slider */}
            <div className="field toggle-field">
              <span>Donkere modus</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={e => {
                    const next = e.target.checked;
                    setDarkMode(next);
                    applyDarkMode(next);
                  }}
                  aria-label="Schakel donkere modus in of uit"
                />
                <span className="slider" aria-hidden="true"></span>
              </label>
            </div>

            <button type="submit" className="primary-btn">Opslaan</button>
            <p className="form-msg" aria-live="polite">{msg}</p>
          </form>

          {/* Geavanceerd blok (placeholder) */}
          <section className="danger-zone" aria-label="Geavanceerde instellingen">
            <h2>Geavanceerd</h2>
            <p>Log uit op dit apparaat.</p>
            <button type="button" className="outline-btn">
              Uitloggen
            </button>
          </section>
        </section>
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} FloraFlow — demo</p>
      </footer>
    </div>
  );
}
