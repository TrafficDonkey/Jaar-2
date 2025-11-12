import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./HomePageStyle.css";
import apiFetch from "../api";

const fmtDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
};

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [veilingen, setVeilingen] = useState([]);
  const [kavels, setKavels] = useState([]);

  const role = localStorage.getItem("role") || "Gebruiker";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const [vRes, kRes] = await Promise.all([
          apiFetch("/Veilingen"),
          apiFetch("/VeilingProducts"),
        ]);
        if (cancelled) return;
        setVeilingen(Array.isArray(vRes) ? vRes : []);
        setKavels(Array.isArray(kRes) ? kRes : []);
      } catch (e) {
        if (!cancelled) setErr(e?.message ?? "Kon gegevens niet laden.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // eerstvolgende kavels (op starttijd veiling)
  const upcoming = useMemo(() => {
    // probeer een datum uit VeilingProduct -> Veiling?.startTijd of Aanmelding?.gewensteVeilDatum
    const list = [...kavels].map(k => {
      const vd = k?.veiling?.startTijd || k?.aanmelding?.gewensteVeilDatum;
      return { ...k, _when: vd ? new Date(vd) : null };
    }).filter(x => x._when && x._when >= new Date());

    list.sort((a,b) => a._when - b._when);
    return list.slice(0, 5);
  }, [kavels]);

  const today = new Intl.DateTimeFormat("nl-NL", { dateStyle: "full" }).format(new Date());

  return (
    <div className="hp-shell">
      <header className="hp-hero" aria-labelledby="hp-title">
        <div className="hp-hero__left">
          <h1 id="hp-title" className="hp-hero__title">
            Welkom terug <span aria-hidden="true">👋</span>
          </h1>
          <p className="hp-hero__sub">
            {today} · Alles wat je nodig hebt op één plek.
          </p>
          <div className="hp-hero__meta">
            <span className="role-badge" aria-label={`Jouw rol: ${role}`}>
              {role}
            </span>
          </div>
        </div>

        <nav className="hp-quick" aria-label="Snel naar">
          {/* Quick actions – nu generiek; later per-rol activeren */}
          <button className="qa-btn" disabled title="Komt binnenkort">
            Product aanmelden
          </button>
          <button className="qa-btn" disabled title="Komt binnenkort">
            Nieuwe veiling
          </button>
          <Link className="qa-link" to="/instellingen">Instellingen</Link>
        </nav>
      </header>

      {/* status / fouten */}
      {err && (
        <div className="hp-alert" role="alert">
          ❌ {err}
        </div>
      )}

      {/* statistieken */}
      <section className="hp-grid" aria-label="Overzicht">
        <article className="stat-card" aria-live="polite">
          <h2 className="stat-card__label">Aantal veilingen</h2>
          <p className="stat-card__value">{veilingen.length}</p>
          <p className="stat-card__hint">Totaal geregistreerd</p>
        </article>

        <article className="stat-card" aria-live="polite">
          <h2 className="stat-card__label">Aantal kavels</h2>
          <p className="stat-card__value">{kavels.length}</p>
          <p className="stat-card__hint">Gepland / afgerond</p>
        </article>

        <article className="stat-card stat-card--ok" aria-live="polite">
          <h2 className="stat-card__label">Systeemstatus</h2>
          <p className="stat-card__value">OK</p>
          <p className="stat-card__hint">Data uit backend (EF Core)</p>
        </article>
      </section>

      {/* eerstvolgende kavels */}
      <section className="hp-panel" aria-labelledby="upcoming-title">
        <div className="hp-panel__head">
          <h2 id="upcoming-title" className="hp-panel__title">Eerstvolgende kavels</h2>
          <span className="hp-panel__meta">Totaal {upcoming.length} kavels</span>
        </div>

        {loading ? (
          <div className="hp-skeleton" aria-hidden="true" />
        ) : upcoming.length === 0 ? (
          <p className="hp-empty">Er zijn nog geen aankomende kavels.</p>
        ) : (
          <ul className="kavel-list">
            {upcoming.map(k => (
              <li key={k.veilingProductId ?? `${k.aanmeldingId}-${k.veilingId}`}>
                <article className="kavel-item">
                  <div className="kavel-item__main">
                    <h3 className="kavel-item__title">
                      {k?.aanmelding?.productBeschrijving ?? "Kavel"}
                    </h3>
                    <p className="kavel-item__sub">
                      {k?.aanmelding?.gewensteKlokLocatie ?? "Locatie n.b."}
                      {" · "}
                      {fmtDate(k?._when)}
                    </p>
                  </div>
                  <div className="kavel-item__side">
                    <Link to="#" className="ghost-btn" aria-disabled="true" title="Komt binnenkort">
                      Bekijken
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* placeholder “laatste activiteit” – klaar voor rol-specifieke blokken */}
      <section className="hp-panel" aria-labelledby="activity-title">
        <div className="hp-panel__head">
          <h2 id="activity-title" className="hp-panel__title">Laatste activiteit</h2>
          <span className="hp-panel__meta">demo</span>
        </div>
        <p className="hp-muted">
          Hier verschijnen binnenkort rol-specifieke updates (bijv. recente biedingen, aangemelde producten, veilingnotities).
        </p>
      </section>
    </div>
  );
}
