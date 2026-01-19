import React from "react";
import { Link } from "react-router-dom";

export default function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="app-footer__inner">
        <div className="app-footer__links">
          <Link to="/privacy">Privacy</Link>
          <span aria-hidden="true">·</span>
          <Link to="/cookies">Cookie-instellingen</Link>
        </div>
        <div className="app-footer__copy">© {new Date().getFullYear()} FloraFlow</div>
      </div>
    </footer>
  );
}

