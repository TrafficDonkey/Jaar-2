// VeilingmeesterPage.jsx
// Scherm voor de rol "Veilingmeester" / "Admin".
// - Laat openstaande aanmeldingen zien (nog niet in een veiling).
// - Laat de huidige actieve veiling + product zien (als die er is).
// - Maakt een nieuwe veiling aan + koppelt daar één aanmelding aan.

import React, { useEffect, useState } from "react";
import "./VeilingmeesterPageStyle.css";
import apiFetch from "../api";

export default function VeilingmeesterPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const [openAanmeldingen, setOpenAanmeldingen] = useState([]);
  const [selectedAanmeldingId, setSelectedAanmeldingId] = useState("");
  const [actieveVeiling, setActieveVeiling] = useState(null);

  // eenvoudige form velden voor een veiling
  const [titel, setTitel] = useState("");
  const [startNu, setStartNu] = useState(true);
  const [startTijd, setStartTijd] = useState("");

  useEffect(() => {
    document.title = "Veilingmeester — FloraFlow";
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    setMsg("");
    try {
      // 1) open aanmeldingen (nog niet gekoppeld aan veiling/product)
      const open = await apiFetch("/Aanmeldingen/open");
      setOpenAanmeldingen(Array.isArray(open) ? open : []);

      // 2) huidige actieve veiling (met product)
      const actief = await apiFetch("/Veilingen/actief");
      // backend mag null / 404 teruggeven; apiFetch van jou gooit bij 404 denk ik een error.
      // Als dat zo is, komt het in catch en zetten we gewoon geen actieve veiling.
      setActieveVeiling(actief ?? null);
    } catch (err) {
      // als 404 op /Veilingen/actief → gewoon negeren
      const message = err?.message ?? String(err);
      if (!message.includes("404")) {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  function formatDate(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    return new Intl.DateTimeFormat("nl-NL", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  }

  async function handleStartVeiling(e) {
    e.preventDefault();
    setError("");
    setMsg("");

    if (!selectedAanmeldingId) {
      setError("Kies eerst een aanmelding.");
      return;
    }

    try {
      setSaving(true);
      const now = new Date();
      const isoNow = now.toISOString();

      const payload = {
        // **LET OP**: pas deze property-namen aan aan jouw CreateVeilingDto
        naam: titel?.trim() || "Veiling",
        status: "Actief",
        startTijd: startNu || !startTijd ? isoNow : new Date(startTijd).toISOString(),
        // eindTijd laten we op null, zodat hij als lopend wordt gezien
        aanmeldingId: Number(selectedAanmeldingId), // voor gemak één aanmelding
      };

      // Backend endpoint dat we zo gaan toevoegen: POST /api/Veilingen/start
      const veiling = await apiFetch("/Veilingen/start", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setMsg("✅ Veiling gestart.");
      setActieveVeiling(veiling);
      // na starten is die aanmelding niet meer “open”
      setSelectedAanmeldingId("");
      await loadData();
    } catch (err) {
      setError(err?.message ?? "Kon veiling niet starten.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-shell vm-shell">
      <main className="vm-main" aria-labelledby="vm-title">
        <section className="vm-panel">
          <header className="vm-header">
            <div>
              <h1 id="vm-title">Veilingbeheer</h1>
              <p className="vm-sub">
                Beheer actieve veilingen en koppel aangemelde producten.
              </p>
            </div>
          </header>

          {error && (
            <div className="vm-alert" role="alert">
              ❌ {error}
            </div>
          )}
          {msg && !error && (
            <p className="vm-msg" aria-live="polite">
              {msg}
            </p>
          )}

          <div className="vm-grid">
            {/* Linker kolom: nieuwe veiling starten */}
            <section className="vm-block">
              <h2>Nieuwe veiling starten</h2>
              <p className="vm-muted">
                Kies een aangemeld product en start een veiling. De status wordt
                direct op <strong>Actief</strong> gezet.
              </p>

              <form onSubmit={handleStartVeiling} className="vm-form" noValidate>
                <div className="field">
                  <label htmlFor="titel">Titel (optioneel)</label>
                  <input
                    id="titel"
                    value={titel}
                    onChange={(e) => setTitel(e.target.value)}
                    placeholder="Bijv. Ochtendveiling kamerplanten"
                  />
                </div>

                <div className="field">
                  <label htmlFor="aanmelding">Te veilen product</label>
                  <select
                    id="aanmelding"
                    value={selectedAanmeldingId}
                    onChange={(e) => setSelectedAanmeldingId(e.target.value)}
                  >
                    <option value="">— Kies een aanmelding —</option>
                    {openAanmeldingen.map((a) => (
                      <option key={a.aanmeldingId} value={a.aanmeldingId}>
                        #{a.aanmeldingId} · {a.productBeschrijving} · min €{" "}
                        {a.minimumPrijs?.toFixed
                          ? a.minimumPrijs.toFixed(2)
                          : a.minimumPrijs}
                      </option>
                    ))}
                  </select>
                  {openAanmeldingen.length === 0 && (
                    <p className="vm-muted">
                      Er zijn geen openstaande aanmeldingen. Laat een aanvoerder
                      eerst producten aanmelden.
                    </p>
                  )}
                </div>

                <fieldset className="field field-inline">
                  <legend>Starttijd</legend>
                  <label className="vm-radio">
                    <input
                      type="radio"
                      name="startTijd"
                      checked={startNu}
                      onChange={() => setStartNu(true)}
                    />
                    <span>Nu starten</span>
                  </label>
                  <label className="vm-radio">
                    <input
                      type="radio"
                      name="startTijd"
                      checked={!startNu}
                      onChange={() => setStartNu(false)}
                    />
                    <span>Andere tijd</span>
                  </label>
                </fieldset>

                {!startNu && (
                  <div className="field">
                    <label htmlFor="starttijd">Start op</label>
                    <input
                      id="starttijd"
                      type="datetime-local"
                      value={startTijd}
                      onChange={(e) => setStartTijd(e.target.value)}
                    />
                  </div>
                )}

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving || openAanmeldingen.length === 0}
                  >
                    {saving ? "Bezig…" : "Veiling starten"}
                  </button>
                </div>
              </form>
            </section>

            {/* Rechter kolom: huidige actieve veiling */}
            <section className="vm-block">
              <h2>Actieve veiling</h2>
              {loading ? (
                <p>Gegevens laden…</p>
              ) : !actieveVeiling ? (
                <p className="vm-muted">Er is op dit moment geen actieve veiling.</p>
              ) : (
                <div className="vm-active">
                  <p className="vm-tag">Status: {actieveVeiling.status}</p>
                  <h3>{actieveVeiling.naam ?? "Veiling"}</h3>
                  <p className="vm-muted">
                    Gestart op {formatDate(actieveVeiling.startTijd)}
                  </p>

                  {actieveVeiling.huidigProduct && (
                    <div className="vm-product">
                      <h4>Huidig product</h4>
                      <p className="vm-product-title">
                        {actieveVeiling.huidigProduct.productBeschrijving}
                      </p>
                      <p className="vm-product-meta">
                        Min. prijs: €{" "}
                        {actieveVeiling.huidigProduct.minimumPrijs?.toFixed
                          ? actieveVeiling.huidigProduct.minimumPrijs.toFixed(2)
                          : actieveVeiling.huidigProduct.minimumPrijs}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
