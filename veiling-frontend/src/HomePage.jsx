import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./HomePageStyle.css";

const API = import.meta.env.VITE_API_BASE ?? "http://localhost:5146/api";

export default function HomePage() {
  const [veilingen, setVeilingen] = useState([]);
  const [kavels, setKavels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [vRes, kRes] = await Promise.all([
          apiFetch("/Veilingen"),
          apiFetch("/VeilingProducts")
        ]);

        if (!vRes.ok || !kRes.ok) {
          console.error("Backend gaf foutcode:", vRes.status, kRes.status);
          return;
        }

        const vData = await vRes.json();
        const kData = await kRes.json();

        setVeilingen(vData);
        setKavels(kData);
      } catch (err) {
        console.error("Fout bij ophalen dashboard-data", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p>Loading…</p>;

  return (
    <div className="page-shell dash-shell">
      {/* ... topbar blijft zoals we hadden ... */}

      <main id="main" className="dash-main">
        {/* header laten we zo */}
        <section className="page-header" aria-label="Welkom">
          <div>
            <h1>Welkom terug 👋</h1>
            <p className="lead">Je veilingoverzicht en eerstvolgende kavels staan hieronder.</p>
          </div>
          <div>
            <Link to="/settings" className="secondary-btn">Profiel bijwerken</Link>
          </div>
        </section>

        {/* stats kun je zo laten, of vullen met veilingen.length */}
        <section className="dash-grid" aria-label="Kerncijfers">
          <article className="stat-card">
            <p className="stat-label">Aantal veilingen</p>
            <p className="stat-value">{veilingen.length}</p>
            <p className="stat-hint">Totaal geregistreerde veilingen.</p>
          </article>

          <article className="stat-card">
            <p className="stat-label">Aantal kavels</p>
            <p className="stat-value">{kavels.length}</p>
            <p className="stat-hint">Producten gekoppeld aan veilingen.</p>
          </article>

          <article className="stat-card">
            <p className="stat-label">Status</p>
            <p className="stat-value">OK</p>
            <p className="stat-hint">Data uit backend (EF Core).</p>
          </article>
        </section>

        {/* lijst met kavels */}
        <section className="panel" aria-label="Eerstvolgende veilingen">
          <div className="panel-head">
            <h2>Eerstvolgende kavels</h2>
            <p className="panel-sub">
              {loading ? "Laden..." : `Totaal ${kavels.length} kavels`}
            </p>
          </div>
          <ul className="auction-list">
            {kavels.map(k => (
              <li key={k.veilingProductId ?? k.id} className="auction-item">
                <div className="auction-title">
                  {k.aanmelding?.productBeschrijving ?? "Onbekend product"}
                </div>
                <div className="auction-meta">
                  <span>{k.veiling?.startTijd?.slice(0, 10) ?? "n.n.b."}</span>
                  <span className="badge">
                    Veiling #{k.veilingId}
                  </span>
                  <button className="ghost-btn-sm" type="button">
                    Bekijken
                  </button>
                </div>
              </li>
            ))}
            {!loading && kavels.length === 0 && (
              <li className="auction-item">Er zijn nog geen kavels.</li>
            )}
          </ul>
        </section>

        {/* klein formulier om een aanmelding te maken */}
        <section className="panel" aria-label="Nieuw product aanmelden">
          <h2>Product aanmelden</h2>
          <AanmeldForm />
        </section>
      </main>
    </div>
  );
}

/** klein formulier onderaan dashboard */
function AanmeldForm() {
  const API = import.meta.env.VITE_API_BASE ?? "http://localhost:5146/api";
  const [beschrijving, setBeschrijving] = React.useState("");
  const [hoeveelheid, setHoeveelheid] = React.useState(10);
  const [msg, setMsg] = React.useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("Versturen…");
    try {
      // let op: aanvoerderId moet echt bestaan in jouw DB
      const res = await fetch(`${API}/Aanmeldingen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fotoUrl: "",
          productBeschrijving: beschrijving,
          hoeveelheid: Number(hoeveelheid),
          minimumPrijs: 1.0,
          gewensteKlokLocatie: "Naaldwijk",
          gewensteVeilDatum: new Date().toISOString(),
          aanvoerderId: 1
        })
      });
      if (!res.ok) {
        const text = await res.text();
        setMsg("❌ Fout: " + text);
      } else {
        setMsg("✅ Aangemeld!");
        setBeschrijving("");
        setHoeveelheid(10);
      }
    } catch (err) {
      setMsg("❌ Netwerkfout: " + err);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="aanmeld-form">
      <label>
        Product
        <input
          value={beschrijving}
          onChange={e => setBeschrijving(e.target.value)}
          required
        />
      </label>
      <label>
        Hoeveelheid
        <input
          type="number"
          min="1"
          value={hoeveelheid}
          onChange={e => setHoeveelheid(e.target.value)}
          required
        />
      </label>
      <button type="submit" className="primary-btn">
        Aanmelden
      </button>
      <p aria-live="polite">{msg}</p>
    </form>
  );
}
