// src/Layout.jsx
// Hoofdlayout voor ingelogde omgeving (navbar + content).

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./Layout.css";

export default function Layout() {
  const nav = useNavigate();

  const [dark, setDark] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  const [role] = useState(() => localStorage.getItem("role") || "");

  // Dark/light theme toepassen op <html> element
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

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("gebruikerId");
    nav("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__brand">
          <div className="logo-circle" aria-hidden="true">
            🌿
          </div>
          <span className="brand-text">FloraFlow</span>
        </div>

        <nav className="topbar__nav" aria-label="Hoofdmenu">
          <NavLink to="." end className="topbar__link">
            Dashboard
          </NavLink>

          {/* Alleen voor rol Klant */}
          {(role === "Klant" || role === "Admin") && (
            <NavLink to="/app/koper" className="topbar__link">
              Kopen
            </NavLink>
          )}

          {(role === "Veilingmeester" || role === "Admin") && (
            <NavLink to="/app/veiling" className="topbar__link">
              Veilingbeheer
            </NavLink>
          )}



          {/* Alleen voor rol Aanvoerder */}
          {(role === "Aanvoerder" || role === "Admin") && (
            <NavLink to="aanvoerder" className="topbar__link">
              Aanvoerder
            </NavLink>
          )}

          {/* Alleen voor rol Admin */}
          {role === "Admin" && (
            <NavLink to="admin" className="topbar__link">
              Beheer
            </NavLink>
          )}

          <NavLink to="instellingen" className="topbar__link">
            Instellingen
          </NavLink>
        </nav>

        <div className="topbar__actions">
          {/* eventueel later weer een theme-toggle naast de logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="logout-btn"
          >
            Uitloggen
          </button>
        </div>
      </header>

      <main className="main-content" aria-live="polite">
        <Outlet />
      </main>
    </div>
  );
}
