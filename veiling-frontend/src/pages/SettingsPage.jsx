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

export default function SettingsPage() {
  // Basisprofielvelden
  const [userId, setUserId] = useState(null);
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState(""); // wordt niet bewerkbaar, maar meegestuurd bij update

  // UI-status
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  // ────────────────────────────── Effect: init ──────────────────────────────
  useEffect(() => {
    document.title = "FloraFlow — Instellingen";

    // 2) gebruiker-profiel laden
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setMsg("");
      try {
        // bepaal gebruikerId
        let id = sessionStorage.getItem("gebruikerId");
        if (id) {
          id = Number(id);
        } else {
          id = getGebruikerIdFromToken();
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

        setUserId(g.gebruikerId);
        setNaam(g.naam || "");
        setEmail(g.email || "");
        setRol(g.rol || "Gebruiker");

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

  // ────────────────────────────── Opslaan ──────────────────────────────

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

    try {
      setLoading(true);
      setMsg("Instellingen opslaan…");

      const payload = {
        gebruikerId: userId,
        naam: trimmedName,
        email: trimmedEmail,
        rol: rol || sessionStorage.getItem("role") || "Gebruiker",
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

      setMsg("✅ Instellingen opgeslagen.");
    } catch (err) {
      setMsg(err?.message ?? "Opslaan van instellingen is mislukt.");
    } finally {
      setLoading(false);
    }
  }

  // ────────────────────────────── Render ──────────────────────────────

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

            <button
              type="submit"
              className="primary-btn"
              disabled={loading || !userId}
            >
              {loading ? "Bezig…" : "Opslaan"}
            </button>

            <p className="form-msg" aria-live="polite">
              {msg}
            </p>
          </form>

          <section className="danger-zone" aria-label="Geavanceerde instellingen">
            <h2>Geavanceerd</h2>
            <p>
              (Optioneel) Hier kun je later zaken toevoegen zoals taalkeuze,
              notificaties of een knop om dit apparaat uit te loggen.
            </p>
          </section>
        </section>
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} FloraFlow — demo</p>
      </footer>
    </div>
  );
}
