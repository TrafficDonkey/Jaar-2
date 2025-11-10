import React, { useEffect, useState } from "react";
import "./RegisterStyle.css";
import { Link, useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_BASE ?? "http://localhost:5146/api";

function RegisterScreen() {
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [role, setRole] = useState("Veilingmeester"); // default matches your checked radio
  const [showPw, setShowPw] = useState(false);
  const [caps, setCaps] = useState(false);
  const [msg, setMsg] = useState("");
  const nav = useNavigate();

  // Prefill email from previous session
  useEffect(() => {
    const last = localStorage.getItem("lastEmail");
    if (last) setEmail(last);
  }, []);

  // Map radio value → API role
  function mapRole(v) {
    if (v === "veilingmeester") return "Veilingmeester";
    if (v === "aanvoerder") return "Aanvoerder";
    return "Klant"; // "gebruiker"
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("Bezig met registreren…");

    const apiRole = mapRole(role);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naam: naam.trim(),
          email: email.trim(),
          password: pw,
          rol: apiRole
        })
      });

      const text = await res.text();
      if (!res.ok) {
        setMsg(`❌ ${res.status} ${res.statusText} — ${text || "Kan niet registreren"}`);
        return;
      }

      localStorage.setItem("lastEmail", email.trim());
      setMsg("✅ Registratie gelukt! Doorsturen naar login…");
      setTimeout(() => nav("/login", { replace: true }), 900);
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
        <form className="form-container" onSubmit={onSubmit}>

          {/* Role Selection */}
          <div className="role-selection">
            <label className="role-option">
              <input
                type="radio"
                name="role"
                value="veilingmeester"
                defaultChecked
                onChange={e => setRole(e.target.value)}
              />
              <span>Veilingmeester</span>
            </label>

            <label className="role-option">
              <input
                type="radio"
                name="role"
                value="aanvoerder"
                onChange={e => setRole(e.target.value)}
              />
              <span>Aanvoerder</span>
            </label>

            <label className="role-option">
              <input
                type="radio"
                name="role"
                value="gebruiker"
                onChange={e => setRole(e.target.value)}
              />
              <span>Gebruiker</span>
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="username">Username:</label>
            <input
              id="username"
              placeholder="Enter your username"
              required
              value={naam}
              onChange={e => setNaam(e.target.value)}
            />
          </div>

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
              <div style={{ color: "#c15a00", fontSize: 12, marginTop: 6 }}>
                ⚠️ Caps Lock staat aan
              </div>
            )}
          </div>

          <div className="button-container">
            <button className="rounded-btn buttonSettings1" type="submit">
              Register
            </button>
            <Link to="/login">
              <button className="rounded-btn buttonSettings1" type="button">
                Go to login
              </button>
            </Link>
          </div>

          <div style={{ color: "white", fontSize: 14, marginTop: 6, textAlign: "center" }}>
            {msg}
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegisterScreen;
