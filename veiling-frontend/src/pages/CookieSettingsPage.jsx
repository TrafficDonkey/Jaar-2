import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  acceptAll,
  getDefaultConsent,
  readConsent,
  rejectAll,
  setConsent,
} from "../privacy/cookieConsent";
import "./CookieSettingsPageStyle.css";
import AppFooter from "../components/AppFooter";
import PublicTopbar from "../components/PublicTopbar";

export default function CookieSettingsPage() {
  const location = useLocation();
  const isAppRoute = location.pathname.startsWith("/app");
  const [analytics, setAnalytics] = useState(() => (readConsent() ?? getDefaultConsent()).analytics);
  const [marketing, setMarketing] = useState(() => (readConsent() ?? getDefaultConsent()).marketing);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    document.title = "Cookie-instellingen";
  }, []);

  function handleSave() {
    setConsent({ analytics, marketing });
    setMsg("Opgeslagen.");
    window.setTimeout(() => setMsg(""), 1200);
  }

  function handleReject() {
    rejectAll();
    const next = readConsent() ?? getDefaultConsent();
    setAnalytics(next.analytics);
    setMarketing(next.marketing);
    setMsg("Alles geweigerd.");
    window.setTimeout(() => setMsg(""), 1200);
  }

  function handleAccept() {
    acceptAll();
    const next = readConsent() ?? getDefaultConsent();
    setAnalytics(next.analytics);
    setMarketing(next.marketing);
    setMsg("Alles geaccepteerd.");
    window.setTimeout(() => setMsg(""), 1200);
  }

  return (
    <>
      {!isAppRoute && <PublicTopbar />}
      <div className="cookie-settings-shell">
        <main className="cookie-settings-main" aria-labelledby="cookie-title">
          <section className="cookie-settings-card">
          <header className="cookie-settings-head">
            <h1 id="cookie-title">Cookie-instellingen</h1>
            <p className="cookie-settings-sub">
              Pas je voorkeuren aan. Noodzakelijke cookies/opslag staan altijd aan.
            </p>
          </header>

          <div className="cookie-settings-grid">
            <div className="cookie-settings-row">
              <div>
                <div className="cookie-settings-name">Noodzakelijk</div>
                <div className="cookie-settings-desc">Altijd aan (login, beveiliging, weergave).</div>
              </div>
              <div className="cookie-settings-badge">Aan</div>
            </div>

            <label className="cookie-settings-row cookie-settings-row--toggle">
              <div>
                <div className="cookie-settings-name">Statistiek / analytics</div>
                <div className="cookie-settings-desc">Helpt ons verbeteren. Alleen met toestemming.</div>
              </div>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
              />
            </label>

            <label className="cookie-settings-row cookie-settings-row--toggle">
              <div>
                <div className="cookie-settings-name">Marketing</div>
                <div className="cookie-settings-desc">Marketing/tracking. Standaard uit.</div>
              </div>
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
              />
            </label>
          </div>

          <div className="cookie-settings-actions">
            <button type="button" className="cookie-settings-btn cookie-settings-btn--ghost" onClick={handleReject}>
              Alles weigeren
            </button>
            <button type="button" className="cookie-settings-btn cookie-settings-btn--ghost" onClick={handleAccept}>
              Alles accepteren
            </button>
            <button type="button" className="cookie-settings-btn cookie-settings-btn--primary" onClick={handleSave}>
              Opslaan
            </button>
          </div>

          <p className="cookie-settings-msg" aria-live="polite">
            {msg}
          </p>

          <p className="cookie-settings-links">
            <Link to="/privacy">Privacyverklaring</Link>
            <span aria-hidden="true">·</span>
            <Link to="/">Home</Link>
          </p>
          </section>
        </main>
        {!isAppRoute && <AppFooter />}
      </div>
    </>
  );
}
