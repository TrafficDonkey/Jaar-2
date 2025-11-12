// Layout.jsx
// Hoofdlay-out van de applicatie (zichtbaar na inloggen).
// Bevat de topnavigatiebalk, themaschakeling (donker/licht), en ruimte voor subpagina's via <Outlet>.

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./Layout.css";

export default function Layout() {
  const nav = useNavigate();

  // ────────────────────────────── THEMASTATUS ──────────────────────────────
  // Lees de huidige themawaarde (donker/licht) uit localStorage bij opstart
  const [dark, setDark] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  // Pas het thema toe op het <html>-element en sla voorkeur op
  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  // ────────────────────────────── LOGOUT ──────────────────────────────
  // Verwijder authenticatiegegevens en navigeer terug naar het login-scherm
  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("gebruikerId");
    nav("/login", { replace: true });
  }

  // ────────────────────────────── LAYOUT ──────────────────────────────
  // Topbar met merknaam en navigatie, gevolgd door de pagina-inhoud
  return (
    <div className="app-shell">
      {/* Navigatiebalk bovenaan */}
      <header className="topbar">
        <div className="topbar__brand">
          <div className="logo-circle" aria-hidden="true">
            🌿
          </div>
          <span className="brand-text">FloraFlow</span>
        </div>

        {/* Hoofdmenu met navigatielinks */}
        <nav className="topbar__nav" aria-label="Hoofdmenu">
          <NavLink to="." end className="topbar__link">
            Dashboard
          </NavLink>
          <NavLink to="instellingen" className="topbar__link">
            Instellingen
          </NavLink>
        </nav>

        {/* Actieknoppen (zoals uitloggen, later evt. themaschakelaar) */}
        <div className="topbar__actions">
          <button type="button" onClick={handleLogout} className="logout-btn">
            Uitloggen
          </button>
        </div>
      </header>

      {/* Hoofdinhoud (wisselt per subpagina via router Outlet) */}
      <main className="main-content" aria-live="polite">
        <Outlet />
      </main>
    </div>
  );
}
