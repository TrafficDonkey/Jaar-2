import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./LoginStyle.css";

const API = import.meta.env.VITE_API_BASE ?? "http://localhost:5146/api";

const getDefaultTarget = () => "/app";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [caps, setCaps] = useState(false);
  const [msg, setMsg] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const nav = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) return;
    const role = sessionStorage.getItem("role");
    nav(getDefaultTarget(role), { replace: true });
  }, [nav]);

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
          twoFactorCode: needsTwoFactor ? twoFactorCode : undefined,
        }),
      });

      // Probeer JSON te lezen, maar val terug op lege object
      const errorBody = res.ok ? null : await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401 && errorBody?.twoFactorRequired) {
          setNeedsTwoFactor(true);
          setMsg(errorBody?.message || "Voer je 2FA-code in om door te gaan.");
          return;
        }

        // Backend stuurt nu { Message, Fouten } bij 400-validatie
        const friendly =
          errorBody?.Message ||
          errorBody?.message ||
          (res.status === 400
            ? "Het email adres of het wachtwoord zijn niet correct ingevuld."
            : "Er ging iets mis bij het inloggen.");

        // Combineer veldfouten indien aanwezig
        let details = "";
        if (errorBody?.Fouten) {
          const lines = errorBody.Fouten.flatMap((f) =>
            f.Errors.map((err) => `- ${f.Field}: ${err}`)
          );
          if (lines.length) {
            details = "\n" + lines.join("\n");
          }
        } else if (errorBody?.title) {
          details = `\n${errorBody.title}`;
        }

        setMsg(`❌ ${friendly}${details}`);
        return;
      }

      const text = await res.text();
      let data = {};
      try {
        data = JSON.parse(text || "{}");
      } catch {
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

      setNeedsTwoFactor(false);
      setTwoFactorCode("");
      setMsg("✅ Ingelogd!");

      // Standaard doel op basis van rol
      const finalRole = data.role || sessionStorage.getItem("role");
      const defaultTarget = getDefaultTarget(finalRole);

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
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (needsTwoFactor) setNeedsTwoFactor(false);
                }}
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
                onChange={(e) => {
                  setPw(e.target.value);
                  if (needsTwoFactor) setNeedsTwoFactor(false);
                }}
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

            {needsTwoFactor && (
              <div className="field">
                <label htmlFor="twoFactorCode">Authenticator-code</label>
                <input
                  id="twoFactorCode"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  required
                />
              </div>
            )}

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
