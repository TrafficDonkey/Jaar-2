import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./LoginStyle.css";
import { API_ORIGIN } from "../api";

// ✅ Base URL zonder /api (dus alleen domain + eventueel poort lokaal)
const API_BASE = API_ORIGIN;

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
  const [msg, setMsg] = useState("");

  const nav = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.title = "FloraFlow — Inloggen";
    const last = localStorage.getItem("lastEmail");
    if (last) setEmail(last);

    // 🔎 Debug (mag je later verwijderen)
    console.log("LoginScreen API_ORIGIN =", API_ORIGIN);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("Inloggen…");

    const cleanEmail = email.trim();
    if (!cleanEmail || !pw) {
      setMsg("❌ Vul je e-mailadres en wachtwoord in.");
      return;
    }

    try {
      // ✅ Jouw AuthController route is: POST /api/auth/login
      const url = `${API_BASE}/api/auth/login`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ✅ LoginDto verwacht: Email + Wachtwoord
        body: JSON.stringify({
          email: cleanEmail,
          password: pw,
        }),
      });

      const body = await readBody(res);

      if (!res.ok) {
        const friendly =
          body?.message ||
          body?.Message ||
          (res.status === 400
            ? "Het e-mailadres of het wachtwoord is niet correct ingevuld."
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

        setMsg(`❌ ${friendly}${details}`);
        return;
      }

      // ✅ verwacht: { token, role, gebruikerId }
      const token = body?.token || body?.Token;
      const role = body?.role || body?.Role;
      const gebruikerId = body?.gebruikerId || body?.GebruikerId;

      if (!token) {
        setMsg("❌ Geen token ontvangen van de server.");
        return;
      }

      localStorage.setItem("lastEmail", cleanEmail);

      sessionStorage.setItem("token", token);
      if (role) sessionStorage.setItem("role", role);
      if (gebruikerId != null)
        sessionStorage.setItem("gebruikerId", String(gebruikerId));

      setMsg("✅ Ingelogd!");

      const finalRole = role || sessionStorage.getItem("role");
      let defaultTarget = "/app";

      if (finalRole === "Aanvoerder") defaultTarget = "/app/aanvoerder";
      else if (finalRole === "Admin") defaultTarget = "/app/admin";
      else if (finalRole === "Veilingmeester") defaultTarget = "/app/veilingmeester";
      else if (finalRole === "Koper") defaultTarget = "/app/koper";

      const from = location.state?.from?.pathname;
      const to = from && from !== "/login" && from !== "/" ? from : defaultTarget;

      nav(to, { replace: true });
    } catch (err) {
      setMsg(`❌ Netwerkfout: ${err?.message ?? String(err)}`);
    }
  }

  return (
    <div className="page-shell login-shell">
      <a href="#main" className="skip-link">
        Ga naar hoofdinhoud
      </a>

      <header className="topbar" aria-label="Hoofdnavigatie">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">🌿</span>
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
