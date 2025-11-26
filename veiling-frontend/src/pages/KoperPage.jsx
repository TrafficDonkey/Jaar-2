// KoperPage.jsx
// Pagina voor rol 'Klant' (koper).
// Toont de huidige actieve veiling + product en laat de gebruiker een bod invoeren.

import React, { useEffect, useState } from "react";
import apiFetch from "../api";
import "./KoperPageStyle.css";

const fmtDateTime = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
};

export default function KoperPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [veiling, setVeiling] = useState(null);
  const [bod, setBod] = useState("");
  const [bodMsg, setBodMsg] = useState("");

  useEffect(() => {
    document.title = "Veiling — Kopen";

    async function load() {
      setLoading(true);
      setErr("");
      setBodMsg("");
      try {
        const data = await apiFetch("/Veilingen/actief");
        setVeiling(data ?? null);
      } catch (e) {
        setErr(e?.message ?? "Kon actieve veiling niet laden.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const product = veiling?.huidigProduct ?? null;

  async function handleBod(e) {
    e.preventDefault();
    setBodMsg("");
    if (!product) return;

    const bodValue = Number(bod.replace(",", "."));
    if (!bodValue || bodValue <= 0) {
      setBodMsg("Voer een geldig bod in.");
      return;
    }

    // Voor nu alleen een frontend-melding; echte bied-API komt later.
    setBodMsg(
      `Je bod van € ${bodValue.toFixed(
        2
      )} is ontvangen (demo – wordt nog niet opgeslagen).`
    );
    setBod("");
  }

  return (
    <div className="kop-shell">
      <header className="kop-head">
        <h1>Veiling — Kopen</h1>
        {veiling && (
          <p className="kop-meta">
            Veiling #{veiling.veilingId} •{" "}
            {fmtDateTime(veiling.startTijd)} –{" "}
            {veiling.eindTijd ? fmtDateTime(veiling.eindTijd) : "nog open"}
          </p>
        )}
      </header>

      {err && (
        <div className="kop-alert" role="alert">
          ❌ {err}
        </div>
      )}

      {loading ? (
        <p>Actieve veiling laden…</p>
      ) : !product ? (
        <p className="kop-empty">Geen actief product gevonden.</p>
      ) : (
        <section className="kop-grid">
          <article className="kop-card">
            <h2>Huidig product</h2>
            <p className="kop-prod-title">{product.productBeschrijving}</p>
            <dl className="kop-prod-dl">
              <div>
                <dt>Hoeveelheid</dt>
                <dd>{product.hoeveelheid}</dd>
              </div>
              <div>
                <dt>Minimumprijs</dt>
                <dd>€ {product.minimumPrijs.toFixed(2)}</dd>
              </div>
              {product.kloklocatie && (
                <div>
                  <dt>Kloklocatie</dt>
                  <dd>{product.kloklocatie}</dd>
                </div>
              )}
            </dl>
            {product.fotoUrl && (
              <img
                src={product.fotoUrl}
                alt={product.productBeschrijving}
                className="kop-prod-img"
              />
            )}
          </article>

          <article className="kop-card">
            <h2>Plaats een bod</h2>
            <form onSubmit={handleBod} className="kop-bid-form">
              <label htmlFor="bod">Bedrag in euro</label>
              <input
                id="bod"
                type="number"
                min="0.01"
                step="0.01"
                value={bod}
                onChange={(e) => setBod(e.target.value)}
                placeholder="Bijv. 12,50"
              />
              <button type="submit" className="btn btn-primary">
                Bod plaatsen
              </button>
            </form>
            {bodMsg && (
              <p className="kop-bid-msg" aria-live="polite">
                {bodMsg}
              </p>
            )}
          </article>
        </section>
      )}
    </div>
  );
}
