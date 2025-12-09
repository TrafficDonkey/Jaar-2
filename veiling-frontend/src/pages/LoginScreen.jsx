import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./LoginStyle.css";

const API = import.meta.env.VITE_API_BASE ?? "http://localhost:5146/api";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [caps, setCaps] = useState(false);
  const [msg, setMsg] = useState("");
  const nav = useNavigate();
  const location = useLocation();

  // Prefill email (mag rustig in localStorage blijven)
  useEffect(() => {
    document.title = "FloraFlow — Inloggen";
    const last = localStorage.getItem("lastEmail");
    if (last) setEmail(last);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("Inloggen…");

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password: pw,
        }),
      });

      const text = await res.text();

      if (!res.ok) {
        setMsg(
          `❌ ${res.status} ${res.statusText} — ${
            text || "Onjuiste inloggegevens"
          }`
        );
        return;
      }

      let data = {};
      try {
        data = JSON.parse(text || "{}");
      } catch {
        // als de server iets raars terugstuurt
        setMsg("❌ Onverwacht antwoord van de server");
        return;
      }

      if (!data.token) {
        setMsg("❌ Geen token ontvangen van de server");
        return;
      }

      // E-mail onthouden is prima in localStorage
      localStorage.setItem("lastEmail", email.trim());

      // Alles wat met de sessie/logins te maken heeft → sessionStorage
      sessionStorage.setItem("token", data.token);
      if (data.role) sessionStorage.setItem("role", data.role);
      if (data.gebruikerId)
        sessionStorage.setItem("gebruikerId", String(data.gebruikerId));

      setMsg("✅ Ingelogd!");

      // Standaard doel op basis van rol
      const finalRole = data.role || sessionStorage.getItem("role");
      let defaultTarget = "/app";
      if (finalRole === "Aanvoerder") {
        defaultTarget = "/app/aanvoerder";
      } else if (finalRole === "Admin") {
        defaultTarget = "/app/admin";
      } else if (finalRole === "Veilingmeester") {
        defaultTarget = "/app/veilingmeester";
      }else if (finalRole === "Koper") {
        defaultTarget = "/app/koper";
      }

      // Als je via een ProtectedRoute komt, ga terug naar die pagina
      const from = location.state?.from?.pathname;
      const to =
        from && from !== "/login" && from !== "/" ? from : defaultTarget;

      nav(to, { replace: true });
    } catch (err) {
      setMsg(`❌ Netwerkfout: ${err?.message ?? err}`);
    }
  }

  return (
    <div className="page-shell login-shell">
      <a href="#main" className="skip-link">
        Ga naar hoofdinhoud
      </a>
      <header className="topbar" aria-label="Hoofdnavigatie">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            🌿
          </span>
          <span className="brand-name">FloraFlow</span>
        </div>
        <Link to="/register" className="topbar-link">
          Account aanmaken
        </Link>
      </header>

      <main id="main" className="login-main" aria-labelledby="login-title">
        <section className="auth-panel" aria-describedby="login-sub">
          <h1 id="login-title">Inloggen</h1>
          <p id="login-sub" className="panel-subtitle">
            Meld je aan om kavels te veilen of te kopen.
          </p>

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="field">
              <label htmlFor="email">E-mailadres</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="naam@bedrijf.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field password-field">
              <label htmlFor="password">Wachtwoord</label>
              <input
                id="password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Wachtwoord"
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
                aria-pressed={showPw}
              >
                {showPw ? "Verberg" : "Toon"}
              </button>
              {caps && <p className="caps-hint">⚠️ Caps Lock staat aan</p>}
            </div>

            <button type="submit" className="primary-btn">
              Inloggen
            </button>

            <p className="form-msg" aria-live="polite">
              {msg}
            </p>
          </form>

          <p className="alt-link">
            Nog geen account? <Link to="/register">Registreer</Link>
          </p>
        </section>
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} FloraFlow — demo</p>
      </footer>
    </div>
  );
}
