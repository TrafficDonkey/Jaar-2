import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./LoginStyle.css";
import { API_ORIGIN } from "../api";

// Base URL zonder /api (dus alleen domain + eventueel poort lokaal)
const API_BASE = API_ORIGIN;

function roleToDefaultTarget(role) {
  if (role === "Aanvoerder") return "/app/aanvoerder";
  if (role === "Admin") return "/app/admin";
  if (role === "Veilingmeester") return "/app/veilingmeester";
  if (role === "Klant") return "/app/koper";
  return "/app";
}

// helper: veilig JSON lezen (of tekst fallback)
async function readBody(res) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  try {
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  } catch {
    return null;
  }
}

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [caps, setCaps] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [msg, setMsg] = useState("");

  const nav = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.title = "FloraFlow - Inloggen";

    const last = localStorage.getItem("lastEmail");
    if (last) setEmail(last);

    const token = sessionStorage.getItem("token");
    if (token) {
      const role = sessionStorage.getItem("role");
      nav(roleToDefaultTarget(role), { replace: true });
    }
  }, [nav]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("Inloggen...");

    const cleanEmail = email.trim();
    if (!cleanEmail || !pw) {
      setMsg("Vul je e-mailadres en wachtwoord in.");
      return;
    }

    if (needsTwoFactor && !twoFactorCode.trim()) {
      setMsg("Voer je authenticator-code in.");
      return;
    }

    try {
      // AuthController route: POST /api/auth/login
      const url = `${API_BASE}/api/auth/login`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password: pw,
          twoFactorCode: needsTwoFactor ? twoFactorCode.trim() : undefined,
        }),
      });

      const body = await readBody(res);

      if (!res.ok) {
        if (res.status === 401 && body?.twoFactorRequired) {
          setNeedsTwoFactor(true);
          setMsg(body?.message || body?.Message || "2FA-code vereist.");
          return;
        }

        const friendly =
          body?.Message ||
          body?.message ||
          (res.status === 400
            ? "Sommige velden zijn niet correct ingevuld."
            : res.status === 401
            ? "Onjuiste inloggegevens."
            : `Er ging iets mis bij het inloggen (${res.status}).`);

        let details = "";

        // custom format { Fouten: [...] }
        if (body?.Fouten && Array.isArray(body.Fouten)) {
          const lines = body.Fouten.flatMap((f) =>
            (f?.Errors || []).map((err) => `- ${f?.Field}: ${err}`)
          );
          if (lines.length) details = "\n" + lines.join("\n");
        }

        // standaard ASP.NET validation format: { errors: { field: [..] } }
        if (!details && body?.errors) {
          const lines = [];
          for (const [field, errs] of Object.entries(body.errors)) {
            for (const err of errs) lines.push(`- ${field}: ${err}`);
          }
          if (lines.length) details = "\n" + lines.join("\n");
        }

        if (!details && body?.raw) details = `\n${body.raw}`;

        setMsg(`${friendly}${details}`);
        return;
      }

      const token = body?.token || body?.Token;
      const role = body?.role || body?.Role;
      const gebruikerId = body?.gebruikerId || body?.GebruikerId;

      if (!token) {
        setMsg("Geen token ontvangen van de server.");
        return;
      }

      localStorage.setItem("lastEmail", cleanEmail);

      sessionStorage.setItem("token", token);
      if (role) sessionStorage.setItem("role", role);
      if (gebruikerId != null)
        sessionStorage.setItem("gebruikerId", String(gebruikerId));

      setNeedsTwoFactor(false);
      setTwoFactorCode("");

      const finalRole = role || sessionStorage.getItem("role");
      const defaultTarget = roleToDefaultTarget(finalRole);
      const from = location.state?.from?.pathname;
      const to = from && from !== "/login" && from !== "/" ? from : defaultTarget;

      nav(to, { replace: true });
    } catch (err) {
      setMsg(`Netwerkfout: ${err?.message ?? String(err)}`);
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
            dYO
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
                  setCaps(e.getModifierState && e.getModifierState("CapsLock"))
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

              {caps && <p className="caps-hint">Caps Lock staat aan</p>}
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
        <p>(c) {new Date().getFullYear()} FloraFlow - demo</p>
      </footer>
    </div>
  );
}

