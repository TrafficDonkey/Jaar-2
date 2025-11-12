// src/Layout.jsx
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./Layout.css";


export default function Layout() {
  const nav = useNavigate();
  const [dark, setDark] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    const root = document.documentElement; // <html>
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
          <NavLink to="instellingen" className="topbar__link">
            Instellingen
          </NavLink>
        </nav>
        <div className="topbar__actions">
          <button type="button" onClick={handleLogout} className="logout-btn">
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
