import React from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

export default function PublicTopbar() {
  const location = useLocation();
  const isLoggedIn = Boolean(sessionStorage.getItem("token"));

  const activeClassName = ({ isActive }) =>
    `topbar__link ${isActive ? "active" : ""}`;

  return (
    <header className="topbar" aria-label="Hoofdnavigatie">
      <div className="topbar__brand">
        <div className="logo-circle" aria-hidden="true" />
        <span className="brand-text">FloraFlow</span>
      </div>

      <nav className="topbar__nav" aria-label="Menu">
        <NavLink to="/" end className={activeClassName}>
          Home
        </NavLink>
        <NavLink to="/privacy" className={activeClassName}>
          Privacy
        </NavLink>
        <NavLink to="/cookies" className={activeClassName}>
          Cookies
        </NavLink>
      </nav>

      <div className="topbar__actions">
        {isLoggedIn ? (
          <Link to="/app" className="topbar__btn topbar__btn--primary">
            Naar app
          </Link>
        ) : (
          <>
            {location.pathname !== "/login" && (
              <Link to="/login" className="topbar__btn topbar__btn--primary">
                Inloggen
              </Link>
            )}
            {location.pathname !== "/register" && (
              <Link to="/register" className="topbar__btn">
                Account aanmaken
              </Link>
            )}
          </>
        )}
      </div>
    </header>
  );
}

