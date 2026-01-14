// src/pages/VeilingmeesterPage.jsx
// Veilingmeester-dashboard met tabs:
// - Nieuwe veiling: aanmeldingen → veiling starten
// - Actieve veilingen: alle veilingen met Status = "Actief" + live timer
// - Archief: afgeronde veilingen
// - Overzicht: kleine samenvatting/statistieken

import React, { useEffect, useMemo, useState } from "react";
import "./VeilingmeesterPageStyle.css";
import apiFetch from "../api";

function formatDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(d);
}

function formatCurrency(value) {
  const nr = Number(value);
  if (Number.isNaN(nr)) return "-";
  return nr.toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Timer-info: vaste duur = 60 seconden vanaf startTijd,
// tenzij backend een expliciete EindTijd teruggeeft.
function getTimerInfo(veiling, nowMs) {
  if (!veiling?.startTijd) {
    return { progress: 0, remainingLabel: "Nog niet gestart" };
  }

  const start = new Date(veiling.startTijd);
  if (Number.isNaN(start.getTime())) {
    return { progress: 0, remainingLabel: "Onbekende starttijd" };
  }

  const startMs = start.getTime();
  const endMs = veiling.eindTijd
    ? new Date(veiling.eindTijd).getTime()
    : startMs + 60 * 1000;

  if (!Number.isFinite(endMs) || endMs <= startMs) {
    return { progress: 0, remainingLabel: "Onbekende looptijd" };
  }

  const total = endMs - startMs;
  const elapsed = Math.max(0, Math.min(total, nowMs - startMs));
  const remainingMs = Math.max(0, endMs - nowMs);

  const seconds = Math.ceil(remainingMs / 1000);
  let remainingLabel = "0s";
  if (seconds > 0) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    remainingLabel = m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  const progress = total === 0 ? 0 : elapsed / total;
  return { progress, remainingLabel };
}

export default function VeilingmeesterPage() {
  // Tabvolgorde: Nieuwe → Actief → Archief → Overzicht
  const [activeTab, setActiveTab] = useState("beheer"); // 'beheer' | 'actief' | 'archief' | 'overzicht'

  const [loading, setLoading] = useState(true);
  const [loadingActive, setLoadingActive] = useState(false);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const [openAanmeldingen, setOpenAanmeldingen] = useState([]);
  const [actieveVeilingen, setActieveVeilingen] = useState([]); // eigen vorm
  const [archiefVeilingen, setArchiefVeilingen] = useState([]); // VeilingDto's uit backend

  // Form voor nieuwe veiling
  const [selectedAanmeldingId, setSelectedAanmeldingId] = useState("");
  const [titel, setTitel] = useState("");

  // Zoeken & sorteren
  const [activeSearch, setActiveSearch] = useState("");
  const [activeSort, setActiveSort] = useState("start-desc"); // start-desc | start-asc | naam

  const [archiveSearch, setArchiveSearch] = useState("");
  const [archiveSort, setArchiveSort] = useState("date-desc"); // date-desc | date-asc | naam | opbrengst

  // "now" voor live timers
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    document.title = "Veilingmeester — FloraFlow";

    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError("");
    setMsg("");
    try {
      await Promise.all([
        loadOpenAanmeldingen(),
        loadActieveVeilingen(),
        loadArchief(),
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function loadOpenAanmeldingen() {
    try {
      // pas dit pad aan als jouw endpoint anders heet
      const open = await apiFetch("/Aanmeldingen/open");
      setOpenAanmeldingen(Array.isArray(open) ? open : []);
    } catch (err) {
      setError(
        (err?.message ?? "Fout bij ophalen van open aanmeldingen.") +
          " (Aanmeldingen/open)"
      );
    }
  }

  async function loadActieveVeilingen() {
    setLoadingActive(true);
    try {
      // Haal ALLE veilingen op
      const alle = await apiFetch("/Veilingen");

      const lijst = Array.isArray(alle) ? alle : [];

      // Filter status "Actief"
      const actief = lijst.filter(
        (v) =>
          v.status &&
          typeof v.status === "string" &&
          v.status.toLowerCase() === "actief"
      );

      // Map naar vereenvoudigd object met 1 "huidigProduct"
      const mapped = actief.map((v) => {
        const eersteProduct =
          v.veilingProducten && v.veilingProducten.length > 0
            ? v.veilingProducten[0]
            : null;

        return {
          veilingId: v.veilingId,
          naam: v.naam,
          status: v.status,
          startTijd: v.startTijd,
          eindTijd: v.eindTijd,
          huidigProduct: eersteProduct
            ? {
                veilingProductId: eersteProduct.veilingProductId,
                aanmeldingId: eersteProduct.aanmeldingId,
                productBeschrijving: eersteProduct.productBeschrijving,
                hoeveelheid: eersteProduct.aantal,
                minimumPrijs: eersteProduct.startPrijs ?? 0,
                kloklocatie: eersteProduct.kloklocatie ?? "",
              }
            : null,
        };
      });

      setActieveVeilingen(mapped);
    } catch (err) {
      setError(err?.message ?? "Kon actieve veilingen niet laden.");
      setActieveVeilingen([]);
    } finally {
      setLoadingActive(false);
    }
  }

  async function loadArchief() {
    setLoadingArchive(true);
    try {
      const res = await apiFetch("/Veilingen/archief");
      setArchiefVeilingen(Array.isArray(res) ? res : []);
    } catch (err) {
      const message = err?.message ?? "Fout bij ophalen van archief.";
      if (!message.includes("404")) {
        setError(message);
      }
      setArchiefVeilingen([]);
    } finally {
      setLoadingArchive(false);
    }
  }

  // Kleine samenvatting voor tab "Overzicht"
  const stats = useMemo(() => {
    const totaalActief = actieveVeilingen.length;
    const totaalArchief = archiefVeilingen.length;

    const totaalOpbrengst = archiefVeilingen.reduce((sum, v) => {
      const nr = Number(v.totaleOpbrengst ?? v.eindPrijs ?? v.eindBedrag);
      return sum + (Number.isNaN(nr) ? 0 : nr);
    }, 0);

    return { totaalActief, totaalArchief, totaalOpbrengst };
  }, [actieveVeilingen, archiefVeilingen]);

  // Gefilterde & gesorteerde lijsten (actief)
  const gefilterdeActieve = useMemo(() => {
    let list = [...actieveVeilingen];

    if (activeSearch.trim()) {
      const q = activeSearch.trim().toLowerCase();
      list = list.filter((v) => {
        const naam = (v.naam ?? "").toLowerCase();
        const prod = (
          v.huidigProduct?.productBeschrijving ?? ""
        ).toLowerCase();
        return naam.includes(q) || prod.includes(q);
      });
    }

    switch (activeSort) {
      case "start-asc":
        list.sort(
          (a, b) =>
            new Date(a.startTijd).getTime() -
            new Date(b.startTijd).getTime()
        );
        break;
      case "naam":
        list.sort((a, b) => (a.naam ?? "").localeCompare(b.naam ?? ""));
        break;
      case "start-desc":
      default:
        list.sort(
          (a, b) =>
            new Date(b.startTijd).getTime() -
            new Date(a.startTijd).getTime()
        );
        break;
    }

    return list;
  }, [actieveVeilingen, activeSearch, activeSort]);

  // Gefilterde & gesorteerde lijsten (archief)
  const gefilterdeArchief = useMemo(() => {
    let list = [...archiefVeilingen];

    if (archiveSearch.trim()) {
      const q = archiveSearch.trim().toLowerCase();
      list = list.filter((v) => {
        const naam = (v.naam ?? "").toLowerCase();
        const winnaar = (v.winnaarNaam ?? v.koperNaam ?? "").toLowerCase();
        return naam.includes(q) || winnaar.includes(q);
      });
    }

    list.sort((a, b) => {
      const dateA = new Date(a.eindTijd ?? a.datum ?? 0).getTime();
      const dateB = new Date(b.eindTijd ?? b.datum ?? 0).getTime();
      const amountA = Number(
        a.totaleOpbrengst ?? a.eindPrijs ?? a.eindBedrag ?? 0
      );
      const amountB = Number(
        b.totaleOpbrengst ?? b.eindPrijs ?? b.eindBedrag ?? 0
      );

      switch (archiveSort) {
        case "date-asc":
          return dateA - dateB;
        case "naam":
          return (a.naam ?? "").localeCompare(b.naam ?? "");
        case "opbrengst":
          return amountB - amountA;
        case "date-desc":
        default:
          return dateB - dateA;
      }
    });

    return list;
  }, [archiefVeilingen, archiveSearch, archiveSort]);

  // Nieuwe veiling starten (vanuit een aanmelding)
  async function handleStartVeiling(e) {
    e.preventDefault();
    setError("");
    setMsg("");

    if (!selectedAanmeldingId) {
      setError("Kies eerst een aanmelding.");
      return;
    }

    const trimmedTitel = titel.trim();

    try {
      setSaving(true);

      const chosen = openAanmeldingen.find(
        (a) => a.aanmeldingId === Number(selectedAanmeldingId)
      );

      const payload = {
        // PAS AAN ALS JOUW StartVeilingDto ANDERE VELDEN HEEFT
        naam:
          trimmedTitel ||
          chosen?.productBeschrijving ||
          `Veiling #${selectedAanmeldingId}`,
        aanmeldingId: Number(selectedAanmeldingId),
      };

      await apiFetch("/Veilingen/start", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setMsg("✅ Veiling gestart.");
      setSelectedAanmeldingId("");
      setTitel("");

      await Promise.all([loadOpenAanmeldingen(), loadActieveVeilingen()]);
    } catch (err) {
      setError(err?.message ?? "Kon veiling niet starten.");
    } finally {
      setSaving(false);
    }
  }

  // Actieve veiling stoppen
  async function handleStopVeiling(veilingId) {
    if (!veilingId) return;
    setError("");
    setMsg("");

    try {
      await apiFetch(`/Veilingen/${veilingId}/stop`, {
        method: "POST",
      });

      setMsg(`Veiling #${veilingId} is gestopt.`);
      await Promise.all([loadActieveVeilingen(), loadArchief()]);
    } catch (err) {
      setError(err?.message ?? "Kon veiling niet stoppen.");
    }
  }

  return (
    <div className="page-shell vm-shell">
      <main className="vm-main" aria-labelledby="vm-title">
        <section className="vm-panel">
          <header className="vm-header">
            <div>
              <h1 id="vm-title">Veilingmeester-dashboard</h1>
              <p className="vm-sub">
                Beheer nieuwe, actieve en afgeronde veilingen. Start veilingen
                op basis van aangemelde producten en volg live de klok.
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

          {/* Tabs in volgorde: Nieuwe → Actief → Archief → Overzicht */}
          <nav className="vm-tabs" aria-label="Veilingweergave">
            <button
              type="button"
              className={`vm-tab ${
                activeTab === "beheer" ? "vm-tab--active" : ""
              }`}
              onClick={() => setActiveTab("beheer")}
            >
              Nieuwe veiling
            </button>
            <button
              type="button"
              className={`vm-tab ${
                activeTab === "actief" ? "vm-tab--active" : ""
              }`}
              onClick={() => setActiveTab("actief")}
            >
              Actieve veilingen
            </button>
            <button
              type="button"
              className={`vm-tab ${
                activeTab === "archief" ? "vm-tab--active" : ""
              }`}
              onClick={() => setActiveTab("archief")}
            >
              Archief
            </button>
            <button
              type="button"
              className={`vm-tab ${
                activeTab === "overzicht" ? "vm-tab--active" : ""
              }`}
              onClick={() => setActiveTab("overzicht")}
            >
              Overzicht
            </button>
          </nav>

          <div className="vm-tabcontent">
            {/* Nieuwe veiling tab */}
            {activeTab === "beheer" && (
              <section aria-label="Nieuwe veiling starten">
                <div className="vm-grid">
                  {/* Linker kolom: start veiling */}
                  <section className="vm-block">
                    <h2>Nieuwe veiling starten</h2>
                    <p className="vm-muted">
                      Kies een aangemeld product en start direct een veiling.
                      Elke veiling duurt 60 seconden vanaf het moment van
                      starten.
                    </p>

                    <form
                      onSubmit={handleStartVeiling}
                      className="vm-form"
                      noValidate
                    >
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
                          onChange={(e) =>
                            setSelectedAanmeldingId(e.target.value)
                          }
                        >
                          <option value="">— Kies een aanmelding —</option>
                          {openAanmeldingen.map((a) => (
                            <option
                              key={a.aanmeldingId}
                              value={a.aanmeldingId}
                            >
                              #{a.aanmeldingId} · {a.productBeschrijving} · min
                              € {formatCurrency(a.minimumPrijs)}
                            </option>
                          ))}
                        </select>
                        {openAanmeldingen.length === 0 && (
                          <p className="vm-muted">
                            Er zijn geen openstaande aanmeldingen. Laat een
                            aanvoerder eerst producten aanmelden.
                          </p>
                        )}
                      </div>

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

                  {/* Rechter kolom: open aanmeldingen */}
                  <section className="vm-block">
                    <h2>Openstaande aanmeldingen</h2>
                    {openAanmeldingen.length === 0 ? (
                      <p className="vm-muted">
                        Er zijn geen openstaande aanmeldingen.
                      </p>
                    ) : (
                      <div className="vm-table-wrap vm-table-wrap--small">
                        <table className="vm-table">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Product</th>
                              <th>Min. prijs</th>
                              <th>Veildatum</th>
                            </tr>
                          </thead>
                          <tbody>
                            {openAanmeldingen.map((a) => (
                              <tr key={a.aanmeldingId}>
                                <td>{a.aanmeldingId}</td>
                                <td>{a.productBeschrijving}</td>
                                <td>€ {formatCurrency(a.minimumPrijs)}</td>
                                <td>{formatDate(a.gewensteVeilDatum)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                </div>
              </section>
            )}

            {/* Actieve veilingen tab */}
            {activeTab === "actief" && (
              <section aria-label="Actieve veilingen">
                {loading || loadingActive ? (
                  <p>Gegevens laden…</p>
                ) : gefilterdeActieve.length === 0 ? (
                  <p className="vm-muted">
                    Er zijn op dit moment geen actieve veilingen.
                  </p>
                ) : (
                  <>
                    <div
                      style={{
                        marginBottom: "0.75rem",
                        display: "flex",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <input
                        placeholder="Zoek op naam of product…"
                        value={activeSearch}
                        onChange={(e) => setActiveSearch(e.target.value)}
                        style={{
                          flex: "1 1 200px",
                          minWidth: "0",
                          borderRadius: "0.75rem",
                          border: "1px solid var(--color-border)",
                          padding: "0.4rem 0.6rem",
                        }}
                      />
                      <select
                        value={activeSort}
                        onChange={(e) => setActiveSort(e.target.value)}
                        style={{
                          flex: "0 0 180px",
                          borderRadius: "0.75rem",
                          border: "1px solid var(--color-border)",
                          padding: "0.4rem 0.6rem",
                        }}
                      >
                        <option value="start-desc">Nieuwste eerst</option>
                        <option value="start-asc">Oudste eerst</option>
                        <option value="naam">Op naam</option>
                      </select>
                    </div>

                    <div className="vm-active-list">
                      {gefilterdeActieve.map((v) => {
                        const id = v.veilingId ?? v.id;
                        const timer = getTimerInfo(v, now);
                        const p = v.huidigProduct;
                        return (
                          <article className="vm-active-card" key={id}>
                            <div className="vm-active-top">
                              <div>
                                <p className="vm-tag">
                                  Status: {v.status ?? "Actief"}
                                </p>
                                <h2 className="vm-active-title">
                                  {v.naam ?? "Veiling"}
                                </h2>
                                <p className="vm-muted">
                                  Gestart op {formatDateTime(v.startTijd)}
                                </p>
                              </div>
                              <div className="vm-active-meta">
                                <p>
                                  Veiling-ID: <strong>{id ?? "-"}</strong>
                                </p>
                                {p && (
                                  <p>
                                    Product-ID:{" "}
                                    <strong>
                                      {p.veilingProductId ?? p.aanmeldingId}
                                    </strong>
                                  </p>
                                )}
                              </div>
                            </div>

                            {p && (
                              <div className="vm-product">
                                <h3 className="vm-product-title">
                                  {p.productBeschrijving}
                                </h3>
                                <p className="vm-product-meta">
                                  Min. prijs: €{" "}
                                  {formatCurrency(p.minimumPrijs ?? 0)}
                                  {typeof p.hoeveelheid !== "undefined" && (
                                    <>
                                      {" · "}Hoeveelheid: {p.hoeveelheid}
                                    </>
                                  )}
                                </p>
                              </div>
                            )}

                            {/* Timer / progressbar */}
                            <div className="vm-timer">
                              <div className="vm-timer-bar">
                                <div
                                  className="vm-timer-bar-fill"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.max(0, timer.progress * 100)
                                    ).toFixed(1)}%`,
                                  }}
                                />
                                <span className="vm-timer-label">
                                  Resterende tijd: {timer.remainingLabel}
                                </span>
                              </div>
                            </div>

                            <div className="vm-active-actions">
                              <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => handleStopVeiling(id)}
                              >
                                Veiling stoppen
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </>
                )}
              </section>
            )}

            {/* Archief tab */}
            {activeTab === "archief" && (
              <section aria-label="Archief van veilingen">
                {loading || loadingArchive ? (
                  <p>Gegevens laden…</p>
                ) : gefilterdeArchief.length === 0 ? (
                  <p className="vm-muted">
                    Er zijn nog geen afgeronde veilingen in het archief.
                  </p>
                ) : (
                  <>
                    <div
                      style={{
                        marginBottom: "0.75rem",
                        display: "flex",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <input
                        placeholder="Zoek op naam of winnaar…"
                        value={archiveSearch}
                        onChange={(e) => setArchiveSearch(e.target.value)}
                        style={{
                          flex: "1 1 200px",
                          minWidth: "0",
                          borderRadius: "0.75rem",
                          border: "1px solid var(--color-border)",
                          padding: "0.4rem 0.6rem",
                        }}
                      />
                      <select
                        value={archiveSort}
                        onChange={(e) => setArchiveSort(e.target.value)}
                        style={{
                          flex: "0 0 200px",
                          borderRadius: "0.75rem",
                          border: "1px solid var(--color-border)",
                          padding: "0.4rem 0.6rem",
                        }}
                      >
                        <option value="date-desc">Nieuwste eerst</option>
                        <option value="date-asc">Oudste eerst</option>
                        <option value="naam">Op naam</option>
                        <option value="opbrengst">Hoogste opbrengst</option>
                      </select>
                    </div>

                    <div className="vm-table-wrap">
                      <table className="vm-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Naam</th>
                            <th>Winnaar</th>
                            <th>Hoeveelheid</th>
                            <th>Eindprijs / opbrengst</th>
                            <th>Afgerond op</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gefilterdeArchief.map((v) => (
                            <tr key={v.veilingId ?? v.id}>
                              <td>{v.veilingId ?? v.id}</td>
                              <td>{v.naam ?? "Veiling"}</td>
                              <td>{v.winnaarNaam ?? v.koperNaam ?? "-"}</td>
                              <td>
                                {typeof v.totaleHoeveelheid !== "undefined"
                                  ? v.totaleHoeveelheid
                                  : v.hoeveelheid ?? "-"}
                              </td>
                              <td>
                                €{" "}
                                {formatCurrency(
                                  v.totaleOpbrengst ??
                                    v.eindPrijs ??
                                    v.eindBedrag ??
                                    0
                                )}
                              </td>
                              <td>
                                {formatDateTime(v.eindTijd ?? v.datum)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </section>
            )}

            {/* Overzicht tab (stat-kaartjes) */}
            {activeTab === "overzicht" && (
              <section aria-label="Overzicht">
                <div className="vm-header-stats vm-header-stats--separate">
                  <div className="vm-stat">
                    <span className="vm-stat-label">Actief</span>
                    <span className="vm-stat-value">{stats.totaalActief}</span>
                  </div>
                  <div className="vm-stat">
                    <span className="vm-stat-label">In archief</span>
                    <span className="vm-stat-value">
                      {stats.totaalArchief}
                    </span>
                  </div>
                  <div className="vm-stat">
                    <span className="vm-stat-label">Totale opbrengst</span>
                    <span className="vm-stat-value">
                      € {formatCurrency(stats.totaalOpbrengst)}
                    </span>
                  </div>
                </div>
                <p className="vm-muted" style={{ marginTop: "0.9rem" }}>
                  Dit tabblad geeft een snel overzicht van het aantal actieve en
                  afgeronde veilingen en de totale opbrengst.
                </p>
              </section>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
