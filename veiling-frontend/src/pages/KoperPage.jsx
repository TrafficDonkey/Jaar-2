import React, { useEffect, useMemo, useState } from "react";
import apiFetch from "../api";
import "./KoperPageStyle.css";
import AuctionClock from "../components/AuctionClock";

const fmtDateTime = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
};

const fmtDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(d);
};

const fmtCurrency = (v) => {
  const nr = Number(v);
  if (Number.isNaN(nr)) return "-";
  return nr.toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function KoperPage() {
  const [loading, setLoading] = useState(true);
  const [loadingVeiling, setLoadingVeiling] = useState(false);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [err, setErr] = useState("");
  const [koopMsg, setKoopMsg] = useState("");

  const [actieveVeilingen, setActieveVeilingen] = useState([]);
  const [selectedVeilingId, setSelectedVeilingId] = useState(null);
  const [veiling, setVeiling] = useState(null);
  const [koopAantal, setKoopAantal] = useState("");
  const [remainingQty, setRemainingQty] = useState(null);
  const [clockRunId, setClockRunId] = useState(1);
  const [currentPrice, setCurrentPrice] = useState(null);

  const [myPurchases, setMyPurchases] = useState([]);

  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyErr, setHistoryErr] = useState("");
  const [historyData, setHistoryData] = useState(null);

  // tab: "veilingen" | "aankopen"
  const [activeTab, setActiveTab] = useState("veilingen");

  // categorie-filter
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const koperIdRaw =
    typeof window !== "undefined"
      ? window.sessionStorage.getItem("gebruikerId")
      : null;
  const koperId = koperIdRaw ? Number(koperIdRaw) : null;

  useEffect(() => {
    document.title = "Koper — FloraFlow";
    (async () => {
      setLoading(true);
      setErr("");
      try {
        await Promise.all([loadActieveVeilingen(), loadMyPurchases()]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadActieveVeilingen() {
    try {
      const alle = await apiFetch("/Veilingen");
      const lijst = Array.isArray(alle) ? alle : [];

      let actief = lijst.filter(
        (v) =>
          v.status &&
          typeof v.status === "string" &&
          v.status.toLowerCase() === "actief"
      );

      // categorie meenemen vanuit eerste product
      actief = actief.map((v) => {
        const first =
          v.veilingProducten && v.veilingProducten.length > 0
            ? v.veilingProducten[0]
            : null;
        return {
          ...v,
          categorie: first?.categorie ?? "",
        };
      });

      actief.sort(
        (a, b) =>
          new Date(b.startTijd).getTime() - new Date(a.startTijd).getTime()
      );

      setActieveVeilingen(actief);

      if (!selectedVeilingId && actief.length > 0) {
        selectVeilingById(actief[0].veilingId);
      }
    } catch (e) {
      setErr(e?.message ?? "Kon actieve veilingen niet laden.");
      setActieveVeilingen([]);
    }
  }

  async function loadMyPurchases() {
    if (!koperId) {
      setMyPurchases([]);
      return;
    }
    setLoadingPurchases(true);
    try {
      const res = await apiFetch("/Toewijzingen");
      const list = Array.isArray(res) ? res : [];
      const mine = list.filter(
        (t) => Number(t.koperId ?? t.KoperId) === koperId
      );

      mine.sort(
        (a, b) =>
          new Date(b.datum ?? b.Datum).getTime() -
          new Date(a.datum ?? a.Datum).getTime()
      );

      setMyPurchases(mine);
    } catch (e) {
      setErr(
        (e?.message ?? "Kon toewijzingen niet ophalen.") +
          " (Mijn aankopen)"
      );
      setMyPurchases([]);
    } finally {
      setLoadingPurchases(false);
    }
  }

  async function selectVeilingById(id) {
    if (!id) return;
    if (id === selectedVeilingId && veiling) return;

    setErr("");
    setKoopMsg("");
    setLoadingVeiling(true);

    try {
      const v = await apiFetch(`/Veilingen/${id}`);
      if (!v) {
        setVeiling(null);
        setSelectedVeilingId(id);
        return;
      }

      const vp =
        v.veilingProducten && v.veilingProducten.length > 0
          ? v.veilingProducten[0]
          : null;

      const mappedProduct = vp
        ? {
            veilingProductId: vp.veilingProductId,
            aanmeldingId: vp.aanmeldingId,
            productBeschrijving: vp.productBeschrijving,
            hoeveelheid: vp.aantal,
            minimumPrijs: vp.startPrijs ?? 0,
            fotoUrl: vp.fotoUrl ?? null,
            kloklocatie: vp.kloklocatie ?? "",
            categorie: vp.categorie ?? "",
          }
        : null;

      const mappedVeiling = {
        veilingId: v.veilingId,
        naam: v.naam,
        status: v.status,
        startTijd: v.startTijd,
        eindTijd: v.eindTijd,
        huidigProduct: mappedProduct,
      };

      setVeiling(mappedVeiling);
      setSelectedVeilingId(id);
      setRemainingQty(mappedProduct?.hoeveelheid ?? null);
      setKoopAantal("");
      setCurrentPrice(null);
      setClockRunId((n) => n + 1);
    } catch (e) {
      setErr(e?.message ?? "Kon veiling niet laden.");
    } finally {
      setLoadingVeiling(false);
    }
  }

  function handleClockPriceChange(price) {
    setCurrentPrice(price);
  }

  function handleClockFinished() {
    setCurrentPrice(null);
    setKoopMsg("De klok is gestopt. Wacht op de volgende ronde of veiling.");
  }

  useEffect(() => {
    if (!showHistory) return;
    function onKeyDown(e) {
      if (e.key === "Escape") setShowHistory(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showHistory]);

  async function handleKoop(e) {
    e.preventDefault();
    const product = veiling?.huidigProduct;
    if (!product || !veiling) return;

    setKoopMsg("");

    if (!koperId) {
      setKoopMsg("Je moet ingelogd zijn als koper om te kunnen kopen.");
      return;
    }

    if (currentPrice == null) {
      setKoopMsg("Wacht tot de klok loopt voordat je kunt kopen.");
      return;
    }

    const qty = Number(String(koopAantal).replace(",", "."));
    if (!qty || qty <= 0) {
      setKoopMsg("Voer een geldig aantal in.");
      return;
    }

    if (remainingQty != null && qty > remainingQty) {
      setKoopMsg(
        `Er zijn nog maar ${remainingQty} stuks beschikbaar voor dit product.`
      );
      return;
    }

    const totaal = currentPrice * qty;

    try {
      const payload = {
        koperId: koperId,
        veilingProductId: product.veilingProductId,
        eindPrijs: currentPrice,
        datum: new Date().toISOString(),
      };

      await apiFetch("/Toewijzingen", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setKoopMsg(
        `Je hebt ${qty}× "${product.productBeschrijving}" gekocht voor €${fmtCurrency(
          currentPrice
        )} per stuk (totaal €${fmtCurrency(totaal)}).`
      );

      if (remainingQty != null) {
        setRemainingQty(remainingQty - qty);
      }

      setKoopAantal("");
      await loadMyPurchases();
    } catch (e2) {
      setKoopMsg(
        e2?.message ?? "Er ging iets mis bij het registreren van de aankoop."
      );
    }
  }

  const product = veiling?.huidigProduct ?? null;

  const { minPrice, maxPrice, durationSeconds } = useMemo(() => {
    if (!product) {
      return { minPrice: 0, maxPrice: 0, durationSeconds: 60 };
    }
    const min = Number(product.minimumPrijs ?? 0);
    const max = min > 0 ? min * 2 : 100;
    return { minPrice: min, maxPrice: max, durationSeconds: 60 };
  }, [product]);

  const quickAmounts = [1, 5, 10, 50, 100];

  const totalPriceLabel = useMemo(() => {
    const qty = Number(String(koopAantal).replace(",", "."));
    if (!product || currentPrice == null || !qty || qty <= 0) return null;
    const totaal = currentPrice * qty;
    return `Totaal: € ${fmtCurrency(totaal)} (${qty} × € ${fmtCurrency(
      currentPrice
    )})`;
  }, [koopAantal, product, currentPrice]);

  const categoryOptions = useMemo(() => {
    const set = new Set();
    for (const v of actieveVeilingen) {
      if (v.categorie) set.add(v.categorie);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "nl-NL"));
  }, [actieveVeilingen]);

  const filteredAuctions = useMemo(() => {
    if (categoryFilter === "ALL") return actieveVeilingen;
    return actieveVeilingen.filter((v) => v.categorie === categoryFilter);
  }, [actieveVeilingen, categoryFilter]);

  useEffect(() => {
    if (!showHistory || !product?.veilingProductId) return;
    setHistoryLoading(true);
    setHistoryErr("");
    setHistoryData(null);

    apiFetch(`/VeilingProducts/${product.veilingProductId}/historische-prijzen`)
      .then((data) => {
        if (!data) {
          setHistoryData(null);
          return;
        }

        const normalized = {
          categorie: data.categorie ?? data.Categorie ?? "",
          aanvoerderNaam: data.aanvoerderNaam ?? data.AanvoerderNaam ?? "",
          laatste10Aanvoerder:
            data.laatste10Aanvoerder ?? data.Laatste10Aanvoerder ?? [],
          gemiddeldeAanvoerder:
            data.gemiddeldeAanvoerder ?? data.GemiddeldeAanvoerder ?? 0,
          laatste10Alle: data.laatste10Alle ?? data.Laatste10Alle ?? [],
          gemiddeldeAlle: data.gemiddeldeAlle ?? data.GemiddeldeAlle ?? 0,
        };

        setHistoryData(normalized);
      })
      .catch((e) => {
        setHistoryErr(
          e?.message ?? "Kon historische prijzen niet ophalen."
        );
      })
      .finally(() => setHistoryLoading(false));
  }, [showHistory, product?.veilingProductId]);

  return (
    <div className="kop-shell">
      <header className="kop-head">
        <h1>Kopersomgeving</h1>
        <p className="kop-sub">
          Kies een veiling, volg de klok live en koop jouw producten. Onderin
          zie je je eigen aankopen.
        </p>
        {err && (
          <p className="kop-error" role="alert">
            ❌ {err}
          </p>
        )}
      </header>

      {/* TABBAR – zelfde stijl als Veilingbeheer */}
      <div className="vm-tabs kop-tabs">
        <button
          type="button"
          className={
            "vm-tab" + (activeTab === "veilingen" ? " vm-tab--active" : "")
          }
          onClick={() => setActiveTab("veilingen")}
        >
          Veilingen
        </button>
        <button
          type="button"
          className={
            "vm-tab" + (activeTab === "aankopen" ? " vm-tab--active" : "")
          }
          onClick={() => setActiveTab("aankopen")}
        >
          Mijn aankopen
        </button>
      </div>

      {loading ? (
        <p>Gegevens laden…</p>
      ) : activeTab === "veilingen" ? (
        <>
          <main className="kop-layout">
            {/* Linker kolom: actieve veilingen + categorie-filter */}
            <section className="kop-left">
              <h2 className="kop-section-title">Actieve veilingen</h2>

              {categoryOptions.length > 0 && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <label
                    htmlFor="catFilter"
                    style={{
                      fontSize: "0.85rem",
                      display: "block",
                      marginBottom: "0.25rem",
                    }}
                  >
                    Filter op categorie
                  </label>
                  <select
                    id="catFilter"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    style={{
                      width: "100%",
                      borderRadius: "0.75rem",
                      border: "1px solid rgba(15,23,42,0.1)",
                      padding: "0.35rem 0.5rem",
                    }}
                  >
                    <option value="ALL">Alle categorieën</option>
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {filteredAuctions.length === 0 ? (
                <p className="kop-extra-text">
                  Er zijn momenteel geen actieve veilingen
                  {categoryFilter !== "ALL" ? " in deze categorie." : "."}
                </p>
              ) : (
                <div className="kop-veiling-list">
                  {filteredAuctions.map((v) => {
                    const id = v.veilingId ?? v.id;
                    const isActive = id === selectedVeilingId;
                    const p =
                      v.veilingProducten && v.veilingProducten.length > 0
                        ? v.veilingProducten[0]
                        : null;
                    return (
                      <button
                        key={id}
                        type="button"
                        className={
                          "kop-veiling-card" +
                          (isActive ? " kop-veiling-card--active" : "")
                        }
                        onClick={() => selectVeilingById(id)}
                      >
                        <div className="kop-veiling-meta">
                          <strong>{v.naam ?? "Veiling"}</strong>
                        </div>
                        {v.categorie && (
                          <div className="kop-veiling-meta">
                            Categorie: {v.categorie}
                          </div>
                        )}
                        <div className="kop-veiling-meta">
                          Gestart op {fmtDateTime(v.startTijd)}
                        </div>
                        {p && (
                          <div className="kop-veiling-prod">
                            {p.productBeschrijving}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Rechter kolom: details + klok + koopformulier */}
            <section className="kop-right">
              {loadingVeiling ? (
                <p>Veiling laden…</p>
              ) : !veiling || !product ? (
                <p className="kop-extra-text">
                  Kies links een veiling om de details te zien en te kunnen
                  kopen.
                </p>
              ) : (
                <div className="kop-detail-card">
                  {/* Product-informatie */}
                  <div className="kop-detail-left">
                    <p className="kop-extra-text">
                      Veiling #{veiling.veilingId} ·{" "}
                      {veiling.naam ?? "Veiling"} · gestart op{" "}
                      {fmtDateTime(veiling.startTijd)}
                    </p>

                    <h2 className="kop-prod-title">
                      {product.productBeschrijving}
                    </h2>

                    {product.fotoUrl && (
                      <img
                        src={product.fotoUrl}
                        alt={product.productBeschrijving}
                        className="kop-prod-img"
                      />
                    )}

                    <div className="kop-prod-dl">
                      <div>
                        <dt>Kloklocatie</dt>
                        <dd>{product.kloklocatie || "Onbekend"}</dd>
                      </div>

                      <div>
                        <dt>Categorie</dt>
                        <dd>{product.categorie || "Onbekend"}</dd>
                      </div>

                      <div>
                        <dt>Minimale prijs</dt>
                        <dd>€ {fmtCurrency(product.minimumPrijs)}</dd>
                      </div>

                      <div>
                        <dt>Beschikbare hoeveelheid</dt>
                        <dd>
                          {remainingQty != null
                            ? `${remainingQty} stuks`
                            : `${product.hoeveelheid} stuks`}
                        </dd>
                      </div>

                      <div>
                        <dt>Veildatum</dt>
                        <dd>{fmtDate(veiling.startTijd)}</dd>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="kop-koop-btn"
                      onClick={() => setShowHistory(true)}
                      disabled={!product?.veilingProductId}
                    >
                      Historische prijzen bekijken
                    </button>

                    <p className="kop-extra-text">
                      De prijs daalt gedurende de ronde. Koop op het juiste
                      moment: hoe langer je wacht, hoe lager de prijs – maar
                      risico dat iemand anders je voor is of de voorraad op is.
                    </p>
                  </div>

                  {/* Klok + koopformulier */}
                  <div>
                    <AuctionClock
                      minPrice={minPrice}
                      maxPrice={maxPrice}
                      durationSeconds={durationSeconds}
                      runId={clockRunId}
                      onPriceChange={handleClockPriceChange}
                      onFinished={handleClockFinished}
                    />

                    <form
                      className="kop-koop-form"
                      onSubmit={handleKoop}
                      noValidate
                    >
                      <label htmlFor="koopAantal">
                        Aantal stuks dat je wilt kopen
                      </label>
                      <input
                        id="koopAantal"
                        type="number"
                        min="1"
                        step="1"
                        value={koopAantal}
                        onChange={(e) => setKoopAantal(e.target.value)}
                        placeholder="Bijv. 10"
                      />

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.4rem",
                          fontSize: "0.85rem",
                        }}
                      >
                        <span style={{ alignSelf: "center" }}>
                          Snel kiezen:
                        </span>
                        {quickAmounts.map((a) => (
                          <button
                            key={a}
                            type="button"
                            onClick={() => setKoopAantal(String(a))}
                            style={{
                              padding: "0.25rem 0.6rem",
                              borderRadius: "999px",
                              border: "1px solid rgba(15,23,42,0.16)",
                              background: "#ffffff",
                              cursor: "pointer",
                            }}
                          >
                            {a}
                          </button>
                        ))}
                      </div>

                      {currentPrice != null && (
                        <p className="kop-extra-text">
                          Huidige prijs per stuk: €{" "}
                          {fmtCurrency(currentPrice)}
                        </p>
                      )}

                      {totalPriceLabel && (
                        <p
                          className="kop-extra-text"
                          style={{ fontWeight: 600 }}
                        >
                          {totalPriceLabel}
                        </p>
                      )}

                      <button type="submit" className="kop-koop-btn">
                        Koop tegen huidige prijs
                      </button>

                      {koopMsg && (
                        <p className="kop-bid-msg" aria-live="polite">
                          {koopMsg}
                        </p>
                      )}
                    </form>
                  </div>
                </div>
              )}
            </section>
          </main>
        </>
      ) : (
        // TAB: Mijn aankopen
        <section
          className="kop-history"
          aria-label="Mijn aankopen"
          style={{ marginTop: "1.75rem" }}
        >
          <h2 style={{ marginBottom: "0.5rem" }}>Mijn aankopen</h2>
          {loadingPurchases ? (
            <p>Gegevens laden…</p>
          ) : !koperId ? (
            <p className="kop-extra-text">
              Je bent niet als koper ingelogd, dus er zijn geen aankopen om te
              tonen.
            </p>
          ) : myPurchases.length === 0 ? (
            <p className="kop-extra-text">
              Je hebt nog geen aankopen gedaan op deze veilingen.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.9rem",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.5rem",
                        borderBottom: "1px solid rgba(15,23,42,0.06)",
                      }}
                    >
                      Datum
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.5rem",
                        borderBottom: "1px solid rgba(15,23,42,0.06)",
                      }}
                    >
                      Product-ID
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.5rem",
                        borderBottom: "1px solid rgba(15,23,42,0.06)",
                      }}
                    >
                      Prijs per stuk
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.5rem",
                        borderBottom: "1px solid rgba(15,23,42,0.06)",
                      }}
                    >
                      Aantal
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.5rem",
                        borderBottom: "1px solid rgba(15,23,42,0.06)",
                      }}
                    >
                      Totaal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {myPurchases.map((t) => {
                    const eindPrijs = t.eindPrijs ?? t.EindPrijs ?? 0;
                    const aantal = 1; // totdat je ook aantallen gaat opslaan
                    const totaal = eindPrijs * aantal;
                    const datum = t.datum ?? t.Datum;
                    return (
                      <tr key={t.toewijzingId ?? t.ToewijzingId}>
                        <td style={{ padding: "0.5rem" }}>
                          {fmtDateTime(datum)}
                        </td>
                        <td style={{ padding: "0.5rem" }}>
                          {t.veilingProductId ?? t.VeilingProductId}
                        </td>
                        <td style={{ padding: "0.5rem" }}>
                          € {fmtCurrency(eindPrijs)}
                        </td>
                        <td style={{ padding: "0.5rem" }}>{aantal}</td>
                        <td style={{ padding: "0.5rem" }}>
                          € {fmtCurrency(totaal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {showHistory && (
        <div
          className="kop-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Historische prijzen"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowHistory(false);
          }}
        >
          <div className="kop-modal">
            <div className="kop-modal-header">
              <div>
                <h3>Historische prijzen</h3>
                <p className="kop-modal-sub">
                  Inzicht in eerdere prijzen voor deze bloemsoort.
                </p>
              </div>
              <button
                type="button"
                className="kop-koop-btn kop-koop-btn--ghost"
                onClick={() => setShowHistory(false)}
              >
                Sluiten
              </button>
            </div>
            <div className="kop-modal-body">
              {historyLoading ? (
                <p className="kop-extra-text">Gegevens laden...</p>
              ) : historyErr ? (
                <p className="kop-error" role="alert">
                  {historyErr}
                </p>
              ) : !historyData ? (
                <p className="kop-extra-text">
                  Geen historische prijzen gevonden voor dit product.
                </p>
              ) : (
                <>
                  <div className="kop-modal-section">
                    <div className="kop-modal-meta">
                      <div>
                        <span>Bloemsoort</span>
                        <strong>{historyData.categorie || "-"}</strong>
                      </div>
                      <div>
                        <span>Aanvoerder</span>
                        <strong>{historyData.aanvoerderNaam || "-"}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="kop-modal-section">
                    <h4>Laatste 10 prijzen van deze aanvoerder</h4>
                    {historyData.laatste10Aanvoerder.length === 0 ? (
                      <p className="kop-extra-text">
                        Geen historische orders voor deze aanvoerder.
                      </p>
                    ) : (
                      <table className="kop-modal-table">
                        <thead>
                          <tr>
                            <th>Aanvoerder</th>
                            <th>Datum</th>
                            <th>Prijs per bloem (EUR)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyData.laatste10Aanvoerder.map((row, idx) => (
                            <tr key={`${row.datum ?? row.Datum}-${idx}`}>
                              <td>
                                {row.aanvoerderNaam ??
                                  row.AanvoerderNaam ??
                                  "-"}
                              </td>
                              <td>{fmtDate(row.datum ?? row.Datum)}</td>
                              <td>
                                {fmtCurrency(
                                  row.prijsPerBloem ?? row.PrijsPerBloem
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    <p className="kop-modal-summary">
                      Gemiddelde prijs (aanvoerder): EUR{" "}
                      {fmtCurrency(historyData.gemiddeldeAanvoerder)}
                    </p>
                  </div>

                  <div className="kop-modal-section">
                    <h4>Laatste 10 prijzen van alle aanvoerders</h4>
                    {historyData.laatste10Alle.length === 0 ? (
                      <p className="kop-extra-text">
                        Geen historische orders beschikbaar.
                      </p>
                    ) : (
                      <table className="kop-modal-table">
                        <thead>
                          <tr>
                            <th>Aanvoerder</th>
                            <th>Datum</th>
                            <th>Prijs per bloem (EUR)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyData.laatste10Alle.map((row, idx) => (
                            <tr key={`${row.datum ?? row.Datum}-${idx}`}>
                              <td>
                                {row.aanvoerderNaam ??
                                  row.AanvoerderNaam ??
                                  "-"}
                              </td>
                              <td>{fmtDate(row.datum ?? row.Datum)}</td>
                              <td>
                                {fmtCurrency(
                                  row.prijsPerBloem ?? row.PrijsPerBloem
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    <p className="kop-modal-summary">
                      Gemiddelde prijs (alle aanvoerders): EUR{" "}
                      {fmtCurrency(historyData.gemiddeldeAlle)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
