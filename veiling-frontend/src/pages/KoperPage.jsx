import React, { useEffect, useMemo, useState } from "react";
import apiFetch, { API_BASE } from "../api";
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

const cleanText = (value) => {
  const txt = String(value ?? "").replace(/\r?\n/g, " ").trim();
  return txt || "-";
};

const API_BASE_URL = API_BASE.endsWith("/") ? API_BASE : `${API_BASE}/`;

const normalizeFotoUrl = (url) => {
  if (!url) return null;
  if (/^(https?:|data:)/i.test(url)) return url;
  return new URL(url, API_BASE_URL).toString();
};

const mapVeilingDto = (v) => {
  const vp =
    v?.veilingProducten && v.veilingProducten.length > 0
      ? v.veilingProducten[0]
      : null;

  const resterendAantal =
    vp?.resterendAantal ?? vp?.ResterendAantal ?? null;
  const hoeveelheid = vp?.aantal ?? vp?.Aantal ?? null;

  const mappedProduct = vp
    ? {
        veilingProductId: vp.veilingProductId,
        aanmeldingId: vp.aanmeldingId,
        productBeschrijving: vp.productBeschrijving,
        hoeveelheid: hoeveelheid ?? 0,
        resterendAantal,
        minimumPrijs: vp.startPrijs ?? 0,
        fotoUrl: normalizeFotoUrl(vp.fotoUrl ?? null),
        kloklocatie: vp.kloklocatie ?? "",
        categorie: vp.categorie ?? "",
      }
    : null;

  const mappedVeiling = v
    ? {
        veilingId: v.veilingId,
        naam: v.naam,
        status: v.status,
        startTijd: v.startTijd,
        eindTijd: v.eindTijd,
        huidigProduct: mappedProduct,
      }
    : null;

  const availableQty =
    mappedProduct?.resterendAantal ?? mappedProduct?.hoeveelheid ?? null;

  return { mappedVeiling, availableQty };
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

  // Popup: state voor historische prijzen (open, loading, error, data)
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
  const role =
    typeof window !== "undefined"
      ? window.sessionStorage.getItem("role") ?? ""
      : "";
  const hideMinPrice = role === "Klant" || role === "Koper";
  const isAdmin = role === "Admin";

  useEffect(() => {
    document.title = "Koper - FloraFlow";
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

      const { mappedVeiling, availableQty } = mapVeilingDto(v);

      setVeiling(mappedVeiling);
      setSelectedVeilingId(id);
      setRemainingQty(availableQty);
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

  // Popup: sluit met ESC
  useEffect(() => {
    if (!showHistory) return;
    function onKeyDown(e) {
      if (e.key === "Escape") setShowHistory(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showHistory]);

  useEffect(() => {
    if (activeTab !== "veilingen" || !selectedVeilingId) return;
    let cancelled = false;

    const refresh = async () => {
      try {
        const v = await apiFetch(`/Veilingen/${selectedVeilingId}`);
        if (!v || cancelled) return;
        const { mappedVeiling, availableQty } = mapVeilingDto(v);
        setVeiling(mappedVeiling);
        setRemainingQty(availableQty);
      } catch {
        // stil falen; we proberen het later opnieuw
      }
    };

    refresh();
    const id = setInterval(refresh, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [activeTab, selectedVeilingId]);

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

    if (remainingQty != null && remainingQty <= 0) {
      setKoopMsg("Dit product is uitverkocht.");
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
        aantal: qty,
        eindPrijs: currentPrice,
        datum: new Date().toISOString(),
      };

      await apiFetch("/Toewijzingen", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setKoopMsg(
        `Je hebt ${qty}x "${product.productBeschrijving}" gekocht voor EUR ${fmtCurrency(
          currentPrice
        )} per stuk (totaal EUR ${fmtCurrency(totaal)}).`
      );

      if (remainingQty != null) {
        setRemainingQty(Math.max(0, remainingQty - qty));
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
    return `Totaal: EUR ${fmtCurrency(totaal)} (${qty} x EUR ${fmtCurrency(
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

  // Popup: laad historische prijzen wanneer geopend
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
            {err}
          </p>
        )}
      </header>

      {/* TABBAR - zelfde stijl als Veilingbeheer */}
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
        <p>Gegevens laden...</p>
      ) : activeTab === "veilingen" ? (
        <>
          <main className="kop-layout">
            {/* Linker kolom: actieve veilingen + categorie-filter */}
            <section className="kop-left">
              <h2 className="kop-section-title">Actieve veilingen</h2>

              {categoryOptions.length > 0 && (
                <div className="kop-filter">
                  <label
                    htmlFor="catFilter"
                    className="kop-filter-label"
                  >
                    Filter op categorie
                  </label>
                  <select
                    id="catFilter"
                    className="kop-filter-select"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="ALL">Alle categorieen</option>
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
                <p>Veiling laden...</p>
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
                      Veiling #{veiling.veilingId} - {veiling.naam ?? "Veiling"}{" "}
                      - gestart op {fmtDateTime(veiling.startTijd)}
                    </p>

                    <h2 className="kop-prod-title">
                      {product.productBeschrijving}
                    </h2>
                    {!hideMinPrice && (
                      <p className="kop-min-price">
                        Minimale prijs: EUR {fmtCurrency(product.minimumPrijs)}
                      </p>
                    )}

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
                        <dt>Beschikbare hoeveelheid</dt>
                        <dd>
                          {(remainingQty ??
                            product.resterendAantal ??
                            product.hoeveelheid) != null
                            ? `${remainingQty ??
                                product.resterendAantal ??
                                product.hoeveelheid} stuks`
                            : "-"}
                        </dd>
                      </div>

                      <div>
                        <dt>Veildatum</dt>
                        <dd>{fmtDate(veiling.startTijd)}</dd>
                      </div>
                    </div>

                    {/* Popup: knop om historische prijzen te openen */}
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
                      moment: hoe langer je wacht, hoe lager de prijs - maar
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

                      <div className="kop-quick-row">
                        <span className="kop-quick-label">Snel kiezen:</span>
                        {quickAmounts.map((a) => (
                          <button
                            key={a}
                            type="button"
                            onClick={() => setKoopAantal(String(a))}
                            className="kop-quick-btn"
                          >
                            {a}
                          </button>
                        ))}
                      </div>

                      {currentPrice != null && (
                        <p className="kop-extra-text">
                          Huidige prijs per stuk: EUR{" "}
                          {fmtCurrency(currentPrice)}
                        </p>
                      )}

                      {totalPriceLabel && (
                        <p className="kop-extra-text kop-extra-text--strong">
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
        >
          <h2 className="kop-history-title">Mijn aankopen</h2>
          {loadingPurchases ? (
            <p>Gegevens laden...</p>
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
            <div className="kop-history-table-wrap">
              <table className="kop-history-table">
                <thead>
                  <tr>
                    {isAdmin && <th>ID</th>}
                    <th>Datum</th>
                    <th>Categorie</th>
                    <th>Beschrijving</th>
                    <th>Prijs per stuk</th>
                    <th>Aantal</th>
                    <th>Totaal</th>
                  </tr>
                </thead>
                <tbody>
                  {myPurchases.map((t) => {
                    const eindPrijs = t.eindPrijs ?? t.EindPrijs ?? 0;
                    const aantal = t.aantal ?? t.Aantal ?? 1;
                    const totaal = eindPrijs * aantal;
                    const datum = t.datum ?? t.Datum;
                    const categorie = cleanText(t.categorie ?? t.Categorie);
                    const beschrijving = cleanText(
                      t.productBeschrijving ?? t.ProductBeschrijving
                    );
                    const toewijzingId =
                      t.toewijzingId ?? t.ToewijzingId ?? "-";
                    return (
                      <tr key={toewijzingId}>
                        {isAdmin && <td>{toewijzingId}</td>}
                        <td>
                          {fmtDateTime(datum)}
                        </td>
                        <td>
                          {categorie}
                        </td>
                        <td>
                          {beschrijving}
                        </td>
                        <td>
                          EUR {fmtCurrency(eindPrijs)}
                        </td>
                        <td>{aantal}</td>
                        <td>
                          EUR {fmtCurrency(totaal)}
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

      {/* Popup: historische prijzen */}
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
