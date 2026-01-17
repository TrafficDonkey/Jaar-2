// SettingsPage.jsx
// Instellingenpagina voor de ingelogde gebruiker.
// - Haalt naam + e-mailadres op uit de backend (Gebruikers-controller)
// - Laat gebruiker deze velden aanpassen
// - Slaat wijzigingen op via PUT /Gebruikers/{id}

import React, { useEffect, useState } from "react";
import "./SettingsPageStyle.css";
import apiFetch from "../api";

// Hulpfunctie: lees gebruikerId uit JWT-token als sessionStorage leeg is
function getGebruikerIdFromToken() {
  const token = sessionStorage.getItem("token");
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    const raw =
      payload.nameid ||
      payload[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
      ] ||
      null;
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

const phoneRules = {
  NL: { min: 9, max: 10, label: "Nederland" },
  BE: { min: 9, max: 9, label: "Belgie" },
  DE: { min: 10, max: 11, label: "Duitsland" },
  FR: { min: 9, max: 9, label: "Frankrijk" },
  UK: { min: 10, max: 10, label: "Verenigd Koninkrijk" },
  US: { min: 10, max: 10, label: "Verenigde Staten" },
};

function validatePhone(country, number) {
  const trimmedCountry = (country || "").trim().toUpperCase();
  if (!trimmedCountry) return "Kies het land van het telefoonnummer.";

  const digits = String(number || "").replace(/\D/g, "");
  if (!digits) return "Telefoonnummer is verplicht.";

  const rule = phoneRules[trimmedCountry] || { min: 8, max: 15, label: trimmedCountry };
  if (digits.length < rule.min || digits.length > rule.max) {
    return `Telefoonnummer voor ${rule.label} moet ${rule.min}-${rule.max} cijfers hebben.`;
  }

  return "";
}

export default function SettingsPage() {
  // Basisprofielvelden
  const [userId, setUserId] = useState(null);
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState(""); // wordt niet bewerkbaar, maar meegestuurd bij update
  const [telefoonLand, setTelefoonLand] = useState("NL");
  const [telefoonNummer, setTelefoonNummer] = useState("");
  const [adresStraat, setAdresStraat] = useState("");
  const [huisnummer, setHuisnummer] = useState("");
  const [postcode, setPostcode] = useState("");
  const [notificationsMuted, setNotificationsMuted] = useState(() => {
    return localStorage.getItem("notificationsMuted") === "true";
  });

  // UI-status
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteMsg, setDeleteMsg] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Effect: init
  useEffect(() => {
    document.title = "FloraFlow - Instellingen";

    // 2) gebruiker-profiel laden
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setMsg("");
      try {
        // bepaal gebruikerId (altijd token leidend; sessionStorage kan verouderen)
        const tokenId = getGebruikerIdFromToken();
        let id = tokenId;
        if (!id) {
          const stored = sessionStorage.getItem("gebruikerId");
          id = stored ? Number(stored) : null;
        }

        if (!id) {
          if (!cancelled) {
            setMsg(
              "Kon de ingelogde gebruiker niet bepalen. Log opnieuw in en probeer het opnieuw."
            );
          }
          return;
        }

        const g = await apiFetch(`/Gebruikers/${id}`);
        if (cancelled) return;

        if (tokenId && g?.gebruikerId && tokenId !== g.gebruikerId) {
          setMsg(
            "Je sessiegegevens komen niet overeen met je token. Log opnieuw in en probeer het opnieuw."
          );
          return;
        }

        setUserId(g.gebruikerId);
        setNaam(g.naam || "");
        setEmail(g.email || "");
        setRol(g.rol || "Gebruiker");
        setTelefoonLand(g.telefoonLand || "NL");
        setTelefoonNummer(g.telefoonNummer || "");
        setAdresStraat(g.adresStraat || "");
        setHuisnummer(g.huisnummer || "");
        setPostcode(g.postcode || "");

        // sessionStorage up-to-date houden
        sessionStorage.setItem("gebruikerId", String(g.gebruikerId));
        if (g.rol) sessionStorage.setItem("role", g.rol);
        if (g.email) localStorage.setItem("lastEmail", g.email);
      } catch (err) {
        if (!cancelled) {
          setMsg(err?.message ?? "Kon profielgegevens niet laden.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  // Opslaan

  async function handleSave(e) {
    e.preventDefault();
    setMsg("");

    if (!userId) {
      setMsg("Geen geldige gebruiker gevonden om op te slaan.");
      return;
    }

    const trimmedName = naam.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail) {
      setMsg("Naam en e-mailadres zijn verplicht.");
      return;
    }

    const phoneError = validatePhone(telefoonLand, telefoonNummer);
    if (phoneError) {
      setMsg(phoneError);
      return;
    }

    const cleanOptional = (value) => {
      const trimmed = (value || "").trim();
      return trimmed ? trimmed : null;
    };

    try {
      setLoading(true);
      setMsg("Instellingen opslaan...");

      const payload = {
        gebruikerId: userId,
        naam: trimmedName,
        email: trimmedEmail,
        rol: rol || sessionStorage.getItem("role") || "Gebruiker",
        telefoonLand: telefoonLand.trim().toUpperCase(),
        telefoonNummer: telefoonNummer.trim(),
        adresStraat: cleanOptional(adresStraat),
        huisnummer: cleanOptional(huisnummer),
        postcode: cleanOptional(postcode),
      };

      await apiFetch(`/Gebruikers/${userId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      // lokale opslag bijwerken (handig voor login-screen & rol)
      localStorage.setItem("lastEmail", trimmedEmail);
      if (payload.rol) {
        sessionStorage.setItem("role", payload.rol);
      }

      setMsg("Instellingen opgeslagen.");
    } catch (err) {
      setMsg(err?.message ?? "Opslaan van instellingen is mislukt.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteMsg("");

    const confirmOk = deleteConfirm.trim().toLowerCase() === "delete";
    if (!confirmOk) {
      setDeleteMsg('Typ eerst "Delete" om te bevestigen.');
      return;
    }

    const ok = window.confirm(
      "Weet je zeker dat je je account wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
    );
    if (!ok) return;

    try {
      setDeleting(true);
      // Token-based endpoint (geen last van verouderde sessionStorage ids)
      const res = await apiFetch("/Gebruikers/me", { method: "DELETE" });

      sessionStorage.removeItem("token");
      sessionStorage.removeItem("role");
      sessionStorage.removeItem("gebruikerId");

      setDeleteMsg(res?.message ?? "Account verwijderd.");
      window.location.href = "/login";
    } catch (err) {
      const status = err?.status;
      if (status === 404) {
        setDeleteMsg(
          "404 Not Found: je backend ondersteunt `DELETE /api/Gebruikers/me` nog niet. Stop/Start de API (VeilingApi) en probeer opnieuw."
        );
        return;
      }
      if (status === 403) {
        setDeleteMsg(
          "403 Forbidden: de API weigert deze actie. Stop en start je backend opnieuw en log opnieuw in. (Controleer in Swagger of `DELETE /api/Gebruikers/me` bestaat.)"
        );
        return;
      }
      setDeleteMsg(err?.message ?? "Account verwijderen is mislukt.");
    } finally {
      setDeleting(false);
    }
  }

  function handleNotificationsToggle(event) {
    const nextMuted = event.target.checked;
    setNotificationsMuted(nextMuted);
    localStorage.setItem("notificationsMuted", String(nextMuted));
    window.dispatchEvent(
      new CustomEvent("floraflow:notifications:mute", {
        detail: { muted: nextMuted },
      })
    );
  }

  // Render

  return (
    <div className="page-shell settings-shell">
      <a href="#main" className="skip-link">
        Ga naar hoofdinhoud
      </a>

      <main id="main" className="settings-main" aria-labelledby="settings-title">
        <section className="settings-panel">
          <h1 id="settings-title">Instellingen</h1>
          <p className="panel-subtitle">
            Beheer je profiel en weergavevoorkeuren.
          </p>

          <form onSubmit={handleSave} className="settings-form" noValidate>
            {/* Naam */}
            <div className="field">
              <label htmlFor="naam">Naam</label>
              <input
                id="naam"
                placeholder="Bijv. Kwekerij Janssen"
                value={naam}
                onChange={(e) => setNaam(e.target.value)}
                required
              />
            </div>

            {/* E-mailadres */}
            <div className="field">
              <label htmlFor="email">E-mailadres</label>
              <input
                id="email"
                type="email"
                placeholder="naam@bedrijf.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="telefoonLand">Land (telefoon)</label>
                <select
                  id="telefoonLand"
                  value={telefoonLand}
                  onChange={(e) => setTelefoonLand(e.target.value)}
                  required
                >
                  <option value="NL">Nederland</option>
                  <option value="BE">Belgie</option>
                  <option value="DE">Duitsland</option>
                  <option value="FR">Frankrijk</option>
                  <option value="UK">Verenigd Koninkrijk</option>
                  <option value="US">Verenigde Staten</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="telefoonNummer">Telefoonnummer</label>
                <input
                  id="telefoonNummer"
                  type="tel"
                  inputMode="tel"
                  placeholder="Bijv. 0612345678"
                  value={telefoonNummer}
                  onChange={(e) => setTelefoonNummer(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="adresStraat">Adres (straat, optioneel)</label>
              <input
                id="adresStraat"
                placeholder="Bijv. Marktstraat"
                value={adresStraat}
                onChange={(e) => setAdresStraat(e.target.value)}
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="huisnummer">Huisnummer (optioneel)</label>
                <input
                  id="huisnummer"
                  placeholder="Bijv. 12A"
                  value={huisnummer}
                  onChange={(e) => setHuisnummer(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="postcode">Postcode (optioneel)</label>
                <input
                  id="postcode"
                  placeholder="Bijv. 1234 AB"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <div className="toggle-field">
                <div>
                  <label htmlFor="notificationsMuted">Meldingsgeluid</label>
                  <p className="field-hint">
                    Nieuwe meldingen blijven zichtbaar in het menu.
                  </p>
                </div>
                <label className="switch">
                  <input
                    id="notificationsMuted"
                    type="checkbox"
                    checked={notificationsMuted}
                    onChange={handleNotificationsToggle}
                    aria-label="Meldingsgeluid dempen"
                  />
                  <span className="slider" aria-hidden="true" />
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="primary-btn"
              disabled={loading || !userId}
            >
              {loading ? "Bezig..." : "Opslaan"}
            </button>

            <p className="form-msg" aria-live="polite">
              {msg}
            </p>
          </form>

          <section className="danger-zone" aria-label="Account verwijderen">
            <h2>Account verwijderen</h2>
            <p>
              Dit verwijdert je account permanent. Type <strong>Delete</strong>{" "}
              om te bevestigen.
            </p>

            <div className="danger-row">
              <input
                className="danger-input"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder='Type "Delete"'
                autoComplete="off"
              />
              <button
                type="button"
                className="danger-btn"
                disabled={
                  deleting || deleteConfirm.trim().toLowerCase() !== "delete"
                }
                onClick={handleDeleteAccount}
              >
                {deleting ? "Bezig..." : "Account verwijderen"}
              </button>
            </div>

            <p className="danger-msg" aria-live="polite">
              {deleteMsg}
            </p>
          </section>
        </section>
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} FloraFlow demo</p>
      </footer>
    </div>
  );
}
