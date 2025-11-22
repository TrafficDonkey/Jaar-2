// src/pages/AanvoerderPage.jsx
// Pagina voor rol "Aanvoerder".
// - Toont formulier om een product aan te melden.
// - Laat "mijn aanmeldingen" en "mijn toewijzingen" zien.
// - Bepaalt de gebruiker via token/localStorage en staat GEEN toegang toe
//   als de rol niet "Aanvoerder" is.

import React, { useEffect, useState } from "react";
import "./AanvoerderPageStyle.css";
import apiFetch from "../api";

// Probeer gebruikerId uit JWT-token te halen
function getGebruikerIdFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    const raw =
      payload.nameid ||
      payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
      payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/nameidentifier"] ||
      null;
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

// Probeer rol uit localStorage / JWT-token te halen
function getRoleFromToken() {
  const stored = localStorage.getItem("role");
  if (stored) return stored;

  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return (
      payload.role ||
      payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
      null
    );
  } catch {
    return null;
  }
}

export default function AanvoerderPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const [role, setRole] = useState(null);
  const [gebruikerId, setGebruikerId] = useState(null);
  const [gebruikerNaam, setGebruikerNaam] = useState("");

  const [aanmeldingen, setAanmeldingen] = useState([]);
  const [toewijzingen, setToewijzingen] = useState([]);

  const [form, setForm] = useState({
    fotoUrl: "",
    productBeschrijving: "",
    hoeveelheid: 1,
    minimumPrijs: 0,
    kloklocatie: "Naaldwijk",
    veilDatum: "",
  });

  // Eerste init: titel + rol + gebruikerId bepalen
  useEffect(() => {
    document.title = "FloraFlow — Aanvoerder";

    const r = getRoleFromToken();
    setRole(r);

    const storedId = localStorage.getItem("gebruikerId");
    if (storedId) {
      setGebruikerId(Number(storedId));
    } else {
      setGebruikerId(getGebruikerIdFromToken());
    }
  }, []);

  // Data laden zodra rol + gebruikerId bekend zijn
  useEffect(() => {
    // Rol bekend maar géén Aanvoerder? -> geen data laden
    if (role && role !== "Aanvoerder") {
      setLoading(false);
      return;
    }
    if (!gebruikerId) {
      // nog aan het bepalen of het lukt niet
      return;
    }

    async function load() {
      setLoading(true);
      setError("");
      setMsg("");

      try {
        // 1) Gebruiker-info ophalen (voor "Ingelogd als …")
        const g = await apiFetch(`/Gebruikers/${gebruikerId}`);
        setGebruikerNaam(g?.naam ?? "");

        // 2) Eigen aanmeldingen + toewijzingen
        // LET OP: ik ga hier uit van backend-routes:
        //   GET /api/Aanmeldingen/mine
        //   GET /api/Toewijzingen/mine
        const [aRes, tRes] = await Promise.all([
          apiFetch("/Aanmeldingen/mine"),
          apiFetch("/Toewijzingen/mine"),
        ]);

        setAanmeldingen(Array.isArray(aRes) ? aRes : []);
        setToewijzingen(Array.isArray(tRes) ? tRes : []);
      } catch (err) {
        setError(err?.message ?? "Kon gegevens niet laden.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [role, gebruikerId]);

  // ───────────────────────── helpers ─────────────────────────

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function formatDate(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    return new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(d);
  }

  // ───────────────────── nieuwe aanmelding opslaan ─────────────────────

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    setError("");

    if (!gebruikerId) {
      setError(
        "Kon de ingelogde gebruiker niet bepalen. Log opnieuw in en probeer het nog eens."
      );
      return;
    }
    if (!form.productBeschrijving.trim()) {
      setError("Productbeschrijving is verplicht.");
      return;
    }
    if (!form.veilDatum) {
      setError("Kies een veildatum.");
      return;
    }

    try {
      setMsg("Aanmelding opslaan…");

      const veilDatumIso = new Date(form.veilDatum + "T00:00:00").toISOString();

      const payload = {
        fotoUrl: form.fotoUrl.trim() || null,
        productBeschrijving: form.productBeschrijving.trim(),
        hoeveelheid: Number(form.hoeveelheid) || 0,
        minimumPrijs: Number(form.minimumPrijs) || 0,
        gewensteKlokLocatie: form.kloklocatie,
        gewensteVeilDatum: veilDatumIso,
        gebruikerId: gebruikerId
      };

      const created = await apiFetch("/Aanmeldingen", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // nieuwe aanmelding bovenaan
      setAanmeldingen((prev) => [created, ...prev]);

      // formulier resetten
      setForm({
        fotoUrl: "",
        productBeschrijving: "",
        hoeveelheid: 1,
        minimumPrijs: 0,
        kloklocatie: "Naaldwijk",
        veilDatum: "",
      });

      setMsg("✅ Aanmelding opgeslagen.");
    } catch (err) {
      setError(err?.message ?? "Opslaan van de aanmelding is mislukt.");
    }
  }

  // ───────────────────── rol-guard (geen aanvoerder) ─────────────────────

  if (role && role !== "Aanvoerder") {
    return (
      <div className="page-shell aanv-shell">
        <main className="aanv-main">
          <section className="aanv-panel">
            <h1>Geen toegang</h1>
            <p className="aanv-sub">
              Deze pagina is alleen beschikbaar voor aanvoerders.
            </p>
          </section>
        </main>
      </div>
    );
  }

  // ────────────────────────── render ──────────────────────────

  return (
    <div className="page-shell aanv-shell">
      <main className="aanv-main" aria-labelledby="aanv-title">
        <section className="aanv-panel">
          <header className="aanv-header">
            <div>
              <h1 id="aanv-title">Product aanmelden</h1>
              <p className="aanv-sub">
                Vul onderstaande gegevens in en klik op Opslaan.
              </p>
              {gebruikerNaam && (
                <p className="aanv-meta">
                  Ingelogd als <strong>{gebruikerNaam}</strong>
                </p>
              )}
            </div>
          </header>

          {error && (
            <div className="aanv-alert" role="alert">
              ❌ {error}
            </div>
          )}
          {msg && !error && (
            <p className="aanv-msg" aria-live="polite">
              {msg}
            </p>
          )}

          <form className="aanv-form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="foto">Foto-URL (optioneel)</label>
              <input
                id="foto"
                type="url"
                placeholder="https://…"
                value={form.fotoUrl}
                onChange={(e) => updateField("fotoUrl", e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="beschrijving">Productbeschrijving</label>
              <input
                id="beschrijving"
                type="text"
                value={form.productBeschrijving}
                onChange={(e) =>
                  updateField("productBeschrijving", e.target.value)
                }
                required
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="hoeveelheid">Hoeveelheid</label>
                <input
                  id="hoeveelheid"
                  type="number"
                  min="1"
                  value={form.hoeveelheid}
                  onChange={(e) => updateField("hoeveelheid", e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="minprijs">Minimumprijs (€)</label>
                <input
                  id="minprijs"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minimumPrijs}
                  onChange={(e) =>
                    updateField("minimumPrijs", e.target.value)
                  }
                  required
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="klok">Kloklocatie</label>
                <select
                  id="klok"
                  value={form.kloklocatie}
                  onChange={(e) => updateField("kloklocatie", e.target.value)}
                >
                  <option value="Naaldwijk">Naaldwijk</option>
                  <option value="Aalsmeer">Aalsmeer</option>
                  <option value="Rijnsburg">Rijnsburg</option>
                  <option value="Eelde">Eelde</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="datum">Veildatum</label>
                <input
                  id="datum"
                  type="date"
                  value={form.veilDatum}
                  onChange={(e) => updateField("veilDatum", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() =>
                  setForm({
                    fotoUrl: "",
                    productBeschrijving: "",
                    hoeveelheid: 1,
                    minimumPrijs: 0,
                    kloklocatie: "Naaldwijk",
                    veilDatum: "",
                  })
                }
              >
                Annuleren
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !gebruikerId}
              >
                {loading ? "Bezig…" : "Opslaan"}
              </button>
            </div>
          </form>
        </section>

        <section className="aanv-panel">
          <h2>Mijn aanmeldingen</h2>
          {loading ? (
            <p>Gegevens laden…</p>
          ) : aanmeldingen.length === 0 ? (
            <p className="aanv-empty">Je hebt nog geen producten aangemeld.</p>
          ) : (
            <table className="aanv-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Product</th>
                  <th>Hoeveelheid</th>
                  <th>Minimumprijs</th>
                  <th>Veildatum</th>
                </tr>
              </thead>
              <tbody>
                {aanmeldingen.map((a) => (
                  <tr key={a.aanmeldingId}>
                    <td>{a.aanmeldingId}</td>
                    <td>{a.productBeschrijving}</td>
                    <td>{a.hoeveelheid}</td>
                    <td>€ {a.minimumPrijs.toFixed(2)}</td>
                    <td>{formatDate(a.gewensteVeilDatum)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="aanv-panel">
          <h2>Mijn toewijzingen</h2>
          {loading ? (
            <p>Gegevens laden…</p>
          ) : toewijzingen.length === 0 ? (
            <p className="aanv-empty">
              Er zijn nog geen kavels toegewezen voor jouw producten.
            </p>
          ) : (
            <table className="aanv-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Veilingproduct</th>
                  <th>Koper</th>
                  <th>Eindprijs</th>
                  <th>Datum</th>
                </tr>
              </thead>
              <tbody>
                {toewijzingen.map((t) => (
                  <tr key={t.toewijzingId}>
                    <td>{t.toewijzingId}</td>
                    <td>{t.veilingProductId}</td>
                    <td>{t.koperNaam}</td>
                    <td>€ {t.eindPrijs.toFixed(2)}</td>
                    <td>{formatDate(t.datum)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}
