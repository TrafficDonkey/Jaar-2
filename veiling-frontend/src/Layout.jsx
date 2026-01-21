// src/Layout.jsx
// Hoofdlayout voor ingelogde omgeving (navbar + content).

import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import notificationSound from "./assets/new-notification-09-352705.mp3";
import "./Layout.css";
import AppFooter from "./components/AppFooter";

export default function Layout() {
  const nav = useNavigate();
  const logoutCancelRef = useRef(null);

  function normalizeDetails(raw) {
    if (!Array.isArray(raw)) return null;
    const cleaned = raw
      .map((item) => {
        const label = String(item?.label ?? "").trim();
        const value = String(item?.value ?? "").trim();
        if (!label || !value) return null;
        return { label, value };
      })
      .filter(Boolean);
    return cleaned.length > 0 ? cleaned : null;
  }

  function normalizeLog(list) {
    return list.map((item) => {
      const details = normalizeDetails(item?.details);
      return {
        ...item,
        read: Boolean(item?.read),
        ...(details ? { details } : {}),
      };
    });
  }

  const [dark, setDark] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });
  const themeName = dark ? "Donker" : "Licht";

  // Rol komt uit de backend (bij login) en wordt opgeslagen in sessionStorage.
  // We gebruiken dit om menu-items te tonen/verbergen en (via ProtectedRoute) routes te beschermen.
  const [role] = useState(() => sessionStorage.getItem("role") || "");
  const [isRinging, setIsRinging] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notificationsMuted, setNotificationsMuted] = useState(() => {
    return localStorage.getItem("notificationsMuted") === "true";
  });
  const [notifLog, setNotifLog] = useState(() => {
    try {
      const raw = sessionStorage.getItem("notifLog");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? normalizeLog(parsed) : [];
    } catch {
      return [];
    }
  });
  const notifCount = notifLog.filter((n) => !n.read).length;
  const [audioReady, setAudioReady] = useState(false);
  const notificationAudioRef = useRef(null);

  function ensureAudio() {
    if (!notificationAudioRef.current) {
      const audio = new Audio(notificationSound);
      audio.preload = "auto";
      audio.volume = 0.7;
      notificationAudioRef.current = audio;
    }
    setAudioReady(true);
  }

  function triggerRing() {
    setIsRinging(true);
    window.setTimeout(() => setIsRinging(false), 500);
  }

  function playNotificationSound() {
    if (notificationsMuted) return;
    ensureAudio();
    const audio = notificationAudioRef.current;
    if (!audio) return;
    if (!audioReady) setAudioReady(true);
    try {
      audio.pause();
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    } catch {
      // ignore audio errors
    }
  }

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

  useEffect(() => {
    // Notificaties opslaan in sessionStorage zodat ze ook op een ander scherm (Meldingen) zichtbaar zijn.
    sessionStorage.setItem("notifLog", JSON.stringify(notifLog));
    sessionStorage.setItem("notifCount", String(notifCount));
  }, [notifLog, notifCount]);

  useEffect(() => {
    // Event-bus voor meldingen:
    // - floraflow:notify: push een melding vanuit een page (bv. "Aanmelding opgeslagen")
    // - floraflow:notifications:update: sync wanneer een melding gelezen/verwijderd wordt
    function onMuteChange(event) {
      if (event?.detail && typeof event.detail.muted === "boolean") {
        setNotificationsMuted(event.detail.muted);
      }
    }

    function onStorageChange(event) {
      if (event.key === "notificationsMuted") {
        setNotificationsMuted(event.newValue === "true");
      }
    }

    function onNotify(event) {
      const text = event?.detail?.text || "Nieuwe melding";
      const type = event?.detail?.type || "info";
      const time =
        event?.detail?.time ||
        new Date().toLocaleTimeString("nl-NL", {
          hour: "2-digit",
          minute: "2-digit",
        });
      const details = normalizeDetails(event?.detail?.details);
      const item = {
        id: `${Date.now()}-${Math.random()}`,
        text,
        type,
        time,
        read: false,
        ...(details ? { details } : {}),
      };

      setNotifLog((prev) =>
        normalizeLog([item, ...prev]).slice(0, 50)
      );
      if (!notificationsMuted) {
        triggerRing();
        playNotificationSound();
      }
    }

    function onUpdate(event) {
      const next = event?.detail?.log;
      if (Array.isArray(next)) {
        setNotifLog(normalizeLog(next));
      }
    }

    window.addEventListener("floraflow:notifications:mute", onMuteChange);
    window.addEventListener("storage", onStorageChange);
    window.addEventListener("floraflow:notify", onNotify);
    window.addEventListener("floraflow:notifications:update", onUpdate);
    return () => {
      window.removeEventListener("floraflow:notifications:mute", onMuteChange);
      window.removeEventListener("storage", onStorageChange);
      window.removeEventListener("floraflow:notify", onNotify);
      window.removeEventListener("floraflow:notifications:update", onUpdate);
    };
  }, [notificationsMuted]);

  useEffect(() => {
    if (!notificationAudioRef.current) {
      const audio = new Audio(notificationSound);
      audio.preload = "auto";
      audio.volume = 0.7;
      notificationAudioRef.current = audio;
    }
  }, []);

  useEffect(() => {
    function unlockAudio() {
      ensureAudio();
    }
    const opts = { once: true };
    document.addEventListener("pointerdown", unlockAudio, opts);
    document.addEventListener("click", unlockAudio, opts);
    document.addEventListener("keydown", unlockAudio, opts);
    document.addEventListener("touchstart", unlockAudio, opts);
    return () => {
      document.removeEventListener("pointerdown", unlockAudio);
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
    };
  }, []);

  function handleBellClick() {
    if (!notificationsMuted) {
      ensureAudio();
      triggerRing();
    }
    setShowNotif((prev) => !prev);
  }

  function handleLogout() {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("gebruikerId");
    nav("/", { replace: true });
  }

  function confirmLogout() {
    setShowLogoutConfirm(true);
  }

  useEffect(() => {
    if (!showLogoutConfirm) return;
    logoutCancelRef.current?.focus();
  }, [showLogoutConfirm]);

  useEffect(() => {
    if (!showNotif && !showLogoutConfirm) return;

    function onKeyDown(event) {
      if (event.key !== "Escape") return;
      if (showLogoutConfirm) {
        setShowLogoutConfirm(false);
        return;
      }
      if (showNotif) setShowNotif(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showNotif, showLogoutConfirm]);

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
          <NavLink to="/app" end className="topbar__link">
            Home
          </NavLink>

          {(role === "Klant" || role === "Veilingmeester" || role === "Admin") && (
            <NavLink to="/app/koper" className="topbar__link">
              {role === "Veilingmeester" ? "Veiling volgen" : "Kopen"}
            </NavLink>
          )}

          {(role === "Veilingmeester" || role === "Admin") && (
            <NavLink to="/app/veilingmeester" className="topbar__link">
              Veilingbeheer
            </NavLink>
          )}



          {/* Alleen voor rol Aanvoerder */}
          {(role === "Aanvoerder" || role === "Admin") && (
            <NavLink to="/app/aanvoerder" className="topbar__link">
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

          <NavLink to="hulp" className="topbar__link">
            Hulp
          </NavLink>
        </nav>

        <div className="topbar__actions">
          <button
            type="button"
            className="notif-btn"
            aria-label={notificationsMuted ? "Meldingen (uit)" : "Meldingen (aan)"}
            aria-expanded={showNotif}
            aria-controls="notif-panel"
            onClick={handleBellClick}
          >
            {notificationsMuted ? (
              <svg
                className={`notif-bell ${isRinging ? "ringing" : ""}`}
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
                <path
                  d="M4 4L20 20"
                  fill="none"
                  stroke="#f0fff4"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg
                className={`notif-bell ${isRinging ? "ringing" : ""}`}
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
              </svg>
            )}
            <span
              className={`notif-badge ${notifCount > 0 ? "show pulse" : ""}`}
              aria-hidden="true"
            >
              {notifCount}
            </span>
          </button>

          <button
            type="button"
            className="theme-btn"
            aria-label={dark ? "Schakel naar lichte modus" : "Schakel naar donkere modus"}
            aria-pressed={dark}
            onClick={() => setDark((value) => !value)}
            title={`Weergave: ${themeName}`}
          >
            {dark ? (
              <svg
                className="theme-btn__icon"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M21.64 13.65A9 9 0 0110.35 2.36a.75.75 0 00-1.02-.86A10.5 10.5 0 1022.5 14.67a.75.75 0 00-.86-1.02z" />
              </svg>
            ) : (
              <svg
                className="theme-btn__icon"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M6.76 4.84l-1.8-1.79L3.17 4.84l1.79 1.79 1.8-1.79zM1 13h3v-2H1v2zm10 10h2v-3h-2v3zm9-10v-2h3v2h-3zm-2.17-8.16l1.79-1.79-1.79-1.8-1.79 1.8 1.79 1.79zM17.24 19.16l1.79 1.79 1.8-1.79-1.8-1.79-1.79 1.79zM4.84 17.24l-1.79 1.79 1.79 1.8 1.79-1.8-1.79-1.79zM12 6a6 6 0 100 12 6 6 0 000-12z" />
              </svg>
            )}
            <span className="theme-btn__text">{themeName}</span>
          </button>

          {showNotif && (
            <div id="notif-panel" className="notif-panel" role="status" aria-live="polite">
              <div className="notif-panel__head">
                <span>Meldingen</span>
                <Link
                  to="/app/meldingen"
                  className="notif-panel__viewall"
                  onClick={() => setShowNotif(false)}
                >
                  View all
                </Link>
              </div>
              {notifLog.length === 0 ? (
                <div className="notif-panel__empty">
                  Geen nieuwe meldingen.
                </div>
              ) : (
                <ul className="notif-panel__list">
                  {notifLog.slice(0, 3).map((item) => (
                    <li
                      key={item.id}
                      className={`notif-panel__item notif-panel__item--${item.type || "info"} ${
                        item.read ? "is-read" : "is-unread"
                      }`}
                    >
                      <span>{item.text}</span>
                      {item.time && (
                        <span className="notif-panel__time">{item.time}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* eventueel later weer een theme-toggle naast de logout */}
          <button
            type="button"
            onClick={confirmLogout}
            className="logout-btn"
          >
            Uitloggen
          </button>
        </div>
      </header>

      {showLogoutConfirm && (
        <div
          className="logout-modal__backdrop"
          role="presentation"
          onMouseDown={() => setShowLogoutConfirm(false)}
        >
          <div
            className="logout-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Uitloggen bevestigen"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2>Uitloggen?</h2>
            <p>Weet je zeker dat je wilt uitloggen?</p>
            <div className="logout-modal__actions">
              <button
                type="button"
                className="logout-modal__btn logout-modal__btn--danger"
                onClick={handleLogout}
              >
                Log uit
              </button>
              <button
                type="button"
                className="logout-modal__btn logout-modal__btn--ghost"
                onClick={() => setShowLogoutConfirm(false)}
                ref={logoutCancelRef}
              >
                Annuleer
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="main-content" aria-live="polite">
        <Outlet />
      </main>

      <AppFooter />
    </div>
  );
}
