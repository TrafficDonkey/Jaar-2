// AanvoerderPage.jsx
// Volledig herschreven versie zonder Aanvoerders-tabel.
// De ingelogde gebruiker *is* de aanvoerder. We gebruiken dus direct gebruikerId
// om aanmeldingen en toewijzingen op te halen en nieuwe aanmeldingen op te slaan.

import React, { useEffect, useState } from "react";
import "./AanvoerderPageStyle.css";
import apiFetch from "../api";

// JWT helper om gebruikerId uit token te halen (fallback voor localStorage)
function getGebruikerIdFromToken() {
  const token = localStorage.getItem("token");
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

export default function AanvoerderPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const [gebruikerNaam, setGebruikerNaam] = useState("");
  const [gebruikerId, setGebruikerId] = useState(null);

  const [aanmeldingen, setAanmeldingen] = useState([]);
  const [toewijzingen, setToewijzingen] = useState([]);

  // Formulier-state
  const [form, setForm] = useState({
    fotoUrl: "",
    productBeschrijving: "",
    hoeveelheid: 1,
    minimumPrijs: 0,
    kloklocatie: "Naaldwijk",
    veilDatum: ""
  });

  // ────────────────────────────── Data laden ──────────────────────────────
  useEffect(() => {
    document.title = "Aanvoerder — Dashboard";

    async function load() {
      setLoading(true);
      setError("");
      setMsg("");

      try {
        // 1) gebruikerId bepalen
        let id = localStorage.getItem("gebruikerId");
        if (id) id = Number(id);
        else id = getGebruikerIdFromToken();

        if (!id) {
          setError("Kon gebruiker niet bepalen. Log opnieuw in.");
          setLoading(false);
          return;
        }

        setGebruikerId(id);

        // 2) Gebruiker-info ophalen
        const gebruiker = await apiFetch(`/Gebruikers/${id}`);
        setGebruikerNaam(gebruiker.naam);

        // 3) Aanmeldingen + toewijzingen laden (gebruiker is nu de aanvoerder)
        const [aanm, toew] = await Promise.all([
          apiFetch(`/Aanmeldingen/by-gebruiker/${id}`),
          apiFetch(`/Toewijzingen/by-gebruiker/${id}`)
        ]);

        setAanmeldingen(Array.isArray(aanm) ? aanm : []);
        setToewijzingen(Array.isArray(toew) ? toew : []);
      } catch (err) {
        setError(err?.message ?? "Gegevens konden niet worden geladen.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // ────────────────────────────── Helpers ──────────────────────────────

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function formatDate(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    return new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(d);
  }

  // ────────────────────────────── Submit nieuwe aanmelding ──────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    setError("");

    if (!gebruikerId) {
      setError("GebruikerId kon niet worden vastgesteld. Log opnieuw in.");
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
        hoeveelheid: Number(form.hoeveelheid),
        minimumPrijs: Number(form.minimumPrijs),
        gewensteKlokLocatie: form.kloklocatie,
        gewensteVeilDatum: veilDatumIso,
        gebruikerId: gebruikerId           // ⭐ Nieuwe sleutel!
      };

      const created = await apiFetch("/Aanmeldingen", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setAanmeldingen((prev) => [created, ...prev]);

      setForm({
        fotoUrl: "",
        productBeschrijving: "",
        hoeveelheid: 1,
        minimumPrijs: 0,
        kloklocatie: "Naaldwijk",
        veilDatum: ""
      });

      setMsg("✅ Aanmelding opgeslagen.");
    } catch (err) {
      setError(err?.message ?? "Opslaan mislukt.");
    }
  }

  // ────────────────────────────── Render ──────────────────────────────

  return (
    <div className="page-shell aanv-shell">
      <main className="aanv-main" aria-labelledby="aanv-title">
        <section className="aanv-panel">
          <header className="aanv-header">
            <h1 id="aanv-title">Product aanmelden</h1>
            <p className="aanv-sub">
              Vul onderstaande gegevens in en klik op Opslaan.
            </p>
            {gebruikerNaam && (
              <p className="aanv-meta">
                Ingelogd als <strong>{gebruikerNaam}</strong>
              </p>
            )}
          </header>

          {error && <div className="aanv-alert">❌ {error}</div>}
          {msg && !error && <p className="aanv-msg">{msg}</p>}

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
                  onChange={(e) => updateField("minimumPrijs", e.target.value)}
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
                    veilDatum: ""
                  })
                }
              >
                Annuleren
              </button>
              <button type="submit" className="btn btn-primary">
                Opslaan
              </button>
            </div>
          </form>
        </section>

        {/* Aanmeldingen tabel */}
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
                  <th>Min. prijs</th>
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

        {/* Toewijzingen tabel */}
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
