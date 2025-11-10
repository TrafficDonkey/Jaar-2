import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./LoginStyle.css";

const API = import.meta.env.VITE_API_BASE ?? "http://localhost:5146/api";

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [caps, setCaps] = useState(false);
  const [msg, setMsg] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    const last = localStorage.getItem("lastEmail");
    if (last) setEmail(last);
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setMsg("Bezig met inloggen…");

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // receive/set auth cookie
        body: JSON.stringify({ email: email.trim(), password: pw })
      });

      const text = await res.text();
      if (!res.ok) {
        setMsg(`❌ ${res.status} ${res.statusText} — ${text || "Onjuiste inloggegevens"}`);
        return;
      }

      localStorage.setItem("lastEmail", email.trim());
      setMsg("✅ Ingelogd!");

      // If API returns { ok, role, naam }, route by role
      let data = {};
      try { data = JSON.parse(text); } catch {}
      setTimeout(() => {
        if (data.role === "Veilingmeester") nav("/homepage", { replace: true });
        else if (data.role === "Aanvoerder") nav("/homepage", { replace: true });
        else nav("/homepage", { replace: true });
      }, 600);
    } catch (err) {
      setMsg(`❌ Netwerkfout: ${err?.message ?? err}`);
    }
  }

  return (
    <div className="page-container">
      <div className="roof"></div>
      <div className="bottom"></div>
      <hr className="top-hr" />
      <hr className="bottom-hr" />

      <div className="login-container">
        <form className="form-container" onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ position: "relative" }}>
            <label htmlFor="password">Password:</label>
            <input
              type={showPw ? "text" : "password"}
              id="password"
              placeholder="Enter your password"
              required
              value={pw}
              onChange={e => setPw(e.target.value)}
              onKeyUp={e => setCaps(e.getModifierState && e.getModifierState("CapsLock"))}
            />
            <button
              type="button"
              className="rounded-btn"
              style={{ position: "absolute", right: 0, top: 28 }}
              onClick={() => setShowPw(s => !s)}
            >
              👁️
            </button>
            {caps && (
              <div style={{ color: "orange", fontSize: 12, marginTop: 6 }}>
                ⚠️ Caps Lock staat aan
              </div>
            )}
          </div>

          <div className="button-container">
            <Link to="/register">
              <button type="button" className="rounded-btn buttonSettings1">
                Go to register
              </button>
            </Link>

            <button type="submit" className="rounded-btn buttonSettings1">
              Login
            </button>
          </div>

          <div style={{ color: "white", fontSize: 14, marginTop: 6, textAlign: "center" }}>
            {msg}
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginScreen;
