// src/pages/RegisterScreen.jsx
// Registratie-scherm. Nieuwe gebruikers krijgen altijd rol "Klant".
// Andere rollen (Aanvoerder / Veilingmeester / Admin) worden door een beheerder toegekend.

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./RegisterStyle.css";

const API = import.meta.env.VITE_API_BASE ?? "http://localhost:5146/api";
const emptyErrors = { general: "", fields: {} };
const phoneRules = {
  NL: { min: 9, max: 10, label: "Nederland" },
  BE: { min: 9, max: 9, label: "Belgie" },
  DE: { min: 10, max: 11, label: "Duitsland" },
  FR: { min: 9, max: 9, label: "Frankrijk" },
  UK: { min: 10, max: 10, label: "Verenigd Koninkrijk" },
  US: { min: 10, max: 10, label: "Verenigde Staten" },
};

const validatePhone = (country, number) => {
  const trimmedCountry = (country || "").trim().toUpperCase();
  if (!trimmedCountry) return "Kies het land van het telefoonnummer.";

  const digits = String(number || "").replace(/\D/g, "");
  if (!digits) return "Telefoonnummer is verplicht.";

  const rule = phoneRules[trimmedCountry] || { min: 8, max: 15, label: trimmedCountry };
  if (digits.length < rule.min || digits.length > rule.max) {
    return `Telefoonnummer voor ${rule.label} moet ${rule.min}-${rule.max} cijfers hebben.`;
  }

  return "";
};

export default function RegisterScreen() {
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [telefoonLand, setTelefoonLand] = useState("NL");
  const [telefoonNummer, setTelefoonNummer] = useState("");
  const [adresStraat, setAdresStraat] = useState("");
  const [huisnummer, setHuisnummer] = useState("");
  const [postcode, setPostcode] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [caps, setCaps] = useState(false);
  const [msg, setMsg] = useState("");
  const [errors, setErrors] = useState(emptyErrors);
  const nav = useNavigate();

  // rol is altijd "Klant" (niet zichtbaar in de UI)
  const [role] = useState("Klant");

  useEffect(() => {
    document.title = "FloraFlow - Account aanmaken";
    const last = localStorage.getItem("lastEmail");
    if (last) setEmail(last);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    setErrors(emptyErrors);

    if (pw !== pw2) {
      const mismatch = "Wachtwoorden komen niet overeen.";
      setErrors({
        general: mismatch,
        fields: { password: mismatch, password2: mismatch },
      });
      return;
    }

    const phoneError = validatePhone(telefoonLand, telefoonNummer);
    if (phoneError) {
      const fieldKey = phoneError.includes("land")
        ? "telefoonland"
        : "telefoonnummer";
      setErrors({
        general: phoneError,
        fields: { [fieldKey]: phoneError },
      });
      return;
    }

    setMsg("Registreren...");
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naam: naam.trim(),
          email: email.trim(),
          password: pw,
          telefoonLand: telefoonLand.trim().toUpperCase(),
          telefoonNummer: telefoonNummer.trim(),
          adresStraat: adresStraat.trim() || null,
          huisnummer: huisnummer.trim() || null,
          postcode: postcode.trim() || null,
          rol: role, // wordt in backend alsnog als 'Klant' gebruikt
        }),
      });

      const text = await res.text();
      let data = {};
      try {
        data = JSON.parse(text || "{}");
      } catch {
        data = {};
      }

      if (!res.ok) {
        const labelMap = {
          naam: "Naam",
          email: "E-mailadres",
          wachtwoord: "Wachtwoord",
          password: "Wachtwoord",
          password2: "Herhaal wachtwoord",
          "herhaal wachtwoord": "Herhaal wachtwoord",
          telefoonland: "Land (telefoon)",
          telefoonnummer: "Telefoonnummer",
          adresstraat: "Adres",
          huisnummer: "Huisnummer",
          postcode: "Postcode",
        };

        const translateError = (raw, label) => {
          const txt = (raw || "").toString().trim();
          const lower = txt.toLowerCase();
          const translations = {
            "the naam field is required.": "Naam is verplicht.",
            "the email field is required.": "E-mailadres is verplicht.",
            "the email field is not a valid e-mail address.": "Voer een geldig e-mailadres in.",
            "the wachtwoord field is required.": "Wachtwoord is verplicht.",
            "the field wachtwoord must be a string or array type with a minimum length of '6'.": "Wachtwoord moet minstens 6 tekens bevatten.",
            "the telefoonland field is required.": "Land (telefoon) is verplicht.",
            "the telefoonnummer field is required.": "Telefoonnummer is verplicht."
          };

          if (translations[lower]) return translations[lower];

          if (lower.includes("field is required")) return `${label} is verplicht.`;
          if (lower.includes("minimum length")) return `${label} moet minstens 6 tekens bevatten.`;

          return txt || `${label} is ongeldig.`;
        };

        const fouten = data.fouten || data.Fouten || [];
        const fieldErrors = {};

        if (Array.isArray(fouten)) {
          fouten.forEach((f) => {
            const key = (f.field || "").toLowerCase();
            const label = labelMap[key] || f.field || "Veld";
            const joined = Array.isArray(f.errors)
              ? f.errors.map((err) => translateError(err, label)).join(" ")
              : translateError(f.errors, label);
            if (key) fieldErrors[key] = joined || `${label} is ongeldig.`;
          });
        }

        const general =
          data.message ||
          data.Message ||
          (res.status === 400
            ? "Sommige velden zijn niet correct ingevuld."
            : "Kan niet registreren.");

        setErrors({ general, fields: fieldErrors });
        setMsg("");
        return;
      }

      localStorage.setItem("lastEmail", email.trim());
      setErrors(emptyErrors);
      setMsg("Gelukt! Doorsturen naar login...");
      setTimeout(() => nav("/login", { replace: true }), 800);
    } catch (err) {
      setErrors(emptyErrors);
      setMsg(`Netwerkfout: ${err.message ?? err}`);
    }
  }

  return (
    <div className="page-shell reg-shell">
      <a href="#main" className="skip-link">
        Ga naar hoofdinhoud
      </a>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            dYOи
          </span>
          <span className="brand-name">FloraFlow</span>
        </div>
        <Link to="/login" className="topbar-link">
          Inloggen
        </Link>
      </header>

      <main id="main" className="reg-main">
        <section className="auth-panel" aria-labelledby="reg-title">
          <h1 id="reg-title">Account aanmaken</h1>
          <p className="panel-subtitle">
            Vul je gegevens in. Je account krijgt standaard de rol {" "}
            <strong>Klant</strong>. Extra rechten worden door een beheerder
            toegekend.
          </p>

          {errors.general && (
            <div className="form-error" role="alert">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="field">
              <label htmlFor="naam">Naam</label>
              <input
                id="naam"
                placeholder="Bijv. Jan de Kweker"
                value={naam}
                onChange={(e) => setNaam(e.target.value)}
                required
                aria-invalid={Boolean(errors.fields.naam)}
                aria-describedby={errors.fields.naam ? "naam-error" : undefined}
                className={errors.fields.naam ? "input-error" : ""}
              />
              {errors.fields.naam && (
                <p className="field-error" id="naam-error" role="alert">
                  {errors.fields.naam}
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor="reg-email">E-mailadres</label>
              <input
                id="reg-email"
                type="email"
                placeholder="naam@bedrijf.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-invalid={Boolean(errors.fields.email)}
                aria-describedby={errors.fields.email ? "email-error" : undefined}
                className={errors.fields.email ? "input-error" : ""}
              />
              {errors.fields.email && (
                <p className="field-error" id="email-error" role="alert">
                  {errors.fields.email}
                </p>
              )}
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="reg-telefoon-land">Land (telefoon)</label>
                <select
                  id="reg-telefoon-land"
                  value={telefoonLand}
                  onChange={(e) => setTelefoonLand(e.target.value)}
                  required
                  aria-invalid={Boolean(errors.fields.telefoonland)}
                  aria-describedby={
                    errors.fields.telefoonland ? "telefoonland-error" : undefined
                  }
                  className={errors.fields.telefoonland ? "input-error" : ""}
                >
                  <option value="NL">Nederland</option>
                  <option value="BE">Belgie</option>
                  <option value="DE">Duitsland</option>
                  <option value="FR">Frankrijk</option>
                  <option value="UK">Verenigd Koninkrijk</option>
                  <option value="US">Verenigde Staten</option>
                </select>
                {errors.fields.telefoonland && (
                  <p
                    className="field-error"
                    id="telefoonland-error"
                    role="alert"
                  >
                    {errors.fields.telefoonland}
                  </p>
                )}
              </div>

              <div className="field">
                <label htmlFor="reg-telefoon">Telefoonnummer</label>
                <input
                  id="reg-telefoon"
                  type="tel"
                  inputMode="tel"
                  placeholder="Bijv. 0612345678"
                  value={telefoonNummer}
                  onChange={(e) => setTelefoonNummer(e.target.value)}
                  required
                  aria-invalid={Boolean(errors.fields.telefoonnummer)}
                  aria-describedby={
                    errors.fields.telefoonnummer ? "telefoonnummer-error" : undefined
                  }
                  className={errors.fields.telefoonnummer ? "input-error" : ""}
                />
                {errors.fields.telefoonnummer && (
                  <p
                    className="field-error"
                    id="telefoonnummer-error"
                    role="alert"
                  >
                    {errors.fields.telefoonnummer}
                  </p>
                )}
              </div>
            </div>

            <div className="field">
              <label htmlFor="reg-adres">Adres (straat, optioneel)</label>
              <input
                id="reg-adres"
                placeholder="Bijv. Marktstraat"
                value={adresStraat}
                onChange={(e) => setAdresStraat(e.target.value)}
                aria-invalid={Boolean(errors.fields.adresstraat)}
                aria-describedby={
                  errors.fields.adresstraat ? "adresstraat-error" : undefined
                }
                className={errors.fields.adresstraat ? "input-error" : ""}
              />
              {errors.fields.adresstraat && (
                <p className="field-error" id="adresstraat-error" role="alert">
                  {errors.fields.adresstraat}
                </p>
              )}
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="reg-huisnummer">Huisnummer (optioneel)</label>
                <input
                  id="reg-huisnummer"
                  placeholder="Bijv. 12A"
                  value={huisnummer}
                  onChange={(e) => setHuisnummer(e.target.value)}
                  aria-invalid={Boolean(errors.fields.huisnummer)}
                  aria-describedby={
                    errors.fields.huisnummer ? "huisnummer-error" : undefined
                  }
                  className={errors.fields.huisnummer ? "input-error" : ""}
                />
                {errors.fields.huisnummer && (
                  <p className="field-error" id="huisnummer-error" role="alert">
                    {errors.fields.huisnummer}
                  </p>
                )}
              </div>

              <div className="field">
                <label htmlFor="reg-postcode">Postcode (optioneel)</label>
                <input
                  id="reg-postcode"
                  placeholder="Bijv. 1234 AB"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  aria-invalid={Boolean(errors.fields.postcode)}
                  aria-describedby={
                    errors.fields.postcode ? "postcode-error" : undefined
                  }
                  className={errors.fields.postcode ? "input-error" : ""}
                />
                {errors.fields.postcode && (
                  <p className="field-error" id="postcode-error" role="alert">
                    {errors.fields.postcode}
                  </p>
                )}
              </div>
            </div>

            <div className="field password-field">
              <label htmlFor="reg-password">Wachtwoord</label>
              <input
                id="reg-password"
                type={showPw ? "text" : "password"}
                placeholder="Minimaal 8 tekens, combinatie van letters en cijfers"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                onKeyUp={(e) =>
                  setCaps(
                    e.getModifierState && e.getModifierState("CapsLock")
                  )
                }
                required
                aria-invalid={Boolean(errors.fields.password || errors.fields.wachtwoord)}
                aria-describedby={
                  errors.fields.password || errors.fields.wachtwoord
                    ? "password-error"
                    : undefined
                }
                className={
                  errors.fields.password || errors.fields.wachtwoord
                    ? "input-error"
                    : ""
                }
              />
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setShowPw((s) => !s)}
              >
                {showPw ? "Verberg" : "Toon"}
              </button>
              {caps && <p className="caps-hint">Caps Lock staat aan</p>}
              {(errors.fields.password || errors.fields.wachtwoord) && (
                <p
                  className="field-error"
                  id="password-error"
                  role="alert"
                >
                  {errors.fields.password || errors.fields.wachtwoord}
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor="reg-password2">Herhaal wachtwoord</label>
              <input
                id="reg-password2"
                type={showPw ? "text" : "password"}
                placeholder="Voer je wachtwoord nogmaals in"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                required
                aria-invalid={Boolean(errors.fields.password2)}
                aria-describedby={
                  errors.fields.password2 ? "password2-error" : undefined
                }
                className={errors.fields.password2 ? "input-error" : ""}
              />
              {errors.fields.password2 && (
                <p className="field-error" id="password2-error" role="alert">
                  {errors.fields.password2}
                </p>
              )}
            </div>

            <button type="submit" className="primary-btn">
              Account maken
            </button>

            <div className="auth-alt" role="note" aria-live="polite">
              Heb je al een account?{" "}
              <Link to="/login" className="link-btn">
                Inloggen
              </Link>
            </div>

            <p className="form-msg" aria-live="polite">
              {msg}
            </p>
          </form>
        </section>
      </main>

      <footer className="footer">
        <p>(c) {new Date().getFullYear()} FloraFlow - demo</p>
      </footer>
    </div>
  );
}
