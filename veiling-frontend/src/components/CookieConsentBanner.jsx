import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  acceptAll,
  getDefaultConsent,
  readConsent,
  rejectAll,
  setConsent,
} from "../privacy/cookieConsent";
import "./CookieConsentBanner.css";

export default function CookieConsentBanner() {
  const existing = useMemo(() => readConsent(), []);
  const [consent, setLocalConsent] = useState(() => existing ?? null);
  const [showPrefs, setShowPrefs] = useState(false);

  const [analytics, setAnalytics] = useState(() => (existing ?? getDefaultConsent()).analytics);
  const [marketing, setMarketing] = useState(() => (existing ?? getDefaultConsent()).marketing);

  useEffect(() => {
    function onUpdate(event) {
      const next = event?.detail ?? readConsent();
      if (next) setLocalConsent(next);
    }
    function onStorage(event) {
      if (event.key === "floraflow.cookieConsent") {
        const next = readConsent();
        if (next) setLocalConsent(next);
      }
    }
    window.addEventListener("floraflow:consent:update", onUpdate);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("floraflow:consent:update", onUpdate);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (consent) return null;

  function handleRejectAll() {
    rejectAll();
    setLocalConsent(readConsent());
  }

  function handleAcceptAll() {
    acceptAll();
    setLocalConsent(readConsent());
  }

  function handleSavePrefs() {
    setConsent({ analytics, marketing });
    setLocalConsent(readConsent());
  }

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie voorkeuren">
      <div className="cookie-banner__inner">
        <div className="cookie-banner__text">
          <strong>Cookies &amp; privacy</strong>
          <p>
            We gebruiken functionele opslag om de app te laten werken. Analytics en
            marketing zijn optioneel. Je kunt dit nu instellen en later wijzigen via{" "}
            <Link to="/cookies">Cookie-instellingen</Link>. Lees ook onze{" "}
            <Link to="/privacy">privacyverklaring</Link>.
          </p>
        </div>

        <div className="cookie-banner__actions">
          <button type="button" className="cookie-btn cookie-btn--ghost" onClick={handleRejectAll}>
            Alles weigeren
          </button>
          <button
            type="button"
            className="cookie-btn cookie-btn--ghost"
            onClick={() => setShowPrefs((v) => !v)}
            aria-expanded={showPrefs}
          >
            Voorkeuren
          </button>
          <button type="button" className="cookie-btn cookie-btn--primary" onClick={handleAcceptAll}>
            Alles accepteren
          </button>
        </div>
      </div>

      {showPrefs && (
        <div className="cookie-prefs" role="region" aria-label="Cookie voorkeuren instellen">
          <div className="cookie-prefs__row">
            <div className="cookie-prefs__meta">
              <div className="cookie-prefs__title">Noodzakelijk</div>
              <div className="cookie-prefs__desc">Altijd aan (login, beveiliging, weergave).</div>
            </div>
            <div className="cookie-prefs__badge">Aan</div>
          </div>

          <label className="cookie-prefs__row cookie-prefs__row--toggle">
            <div className="cookie-prefs__meta">
              <div className="cookie-prefs__title">Statistiek / analytics</div>
              <div className="cookie-prefs__desc">
                Helpt ons de app te verbeteren. Alleen met jouw toestemming.
              </div>
            </div>
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
            />
          </label>

          <label className="cookie-prefs__row cookie-prefs__row--toggle">
            <div className="cookie-prefs__meta">
              <div className="cookie-prefs__title">Marketing</div>
              <div className="cookie-prefs__desc">
                Gebruikt voor marketing/tracking. Standaard uit.
              </div>
            </div>
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
            />
          </label>

          <div className="cookie-prefs__footer">
            <button type="button" className="cookie-btn cookie-btn--primary" onClick={handleSavePrefs}>
              Opslaan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

