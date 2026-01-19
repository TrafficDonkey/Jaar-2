import React, { useEffect, useMemo, useState } from "react";
import apiFetch, { API_BASE } from "../api";
import "./KoperPageStyle.css";
import AuctionClock from "../components/AuctionClock";
import {
  formatDate as fmtDate,
  formatDateTime as fmtDateTime,
  toTimeMs,
} from "../utils/date";

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

const splitProductDescription = (value) => {
  const raw = String(value ?? "").replace(/\r?\n/g, " ").trim();
  if (!raw) return { title: "-", lines: [] };

  const byPipe = raw
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  let title = byPipe[0] ?? "-";
  let lines = byPipe.slice(1);

  if (title.includes(" - ")) {
    const [first, ...rest] = title.split(" - ");
    const detail = rest.join(" - ").trim();
    title = first.trim() || title;
    if (detail) {
      lines = [detail, ...lines];
    }
  }

  return { title, lines };
};

const API_BASE_URL = API_BASE.endsWith("/") ? API_BASE : `${API_BASE}/`;

const normalizeFotoUrl = (url) => {
  if (!url) return null;
  if (/^(https?:|data:)/i.test(url)) return url;
  return new URL(url, API_BASE_URL).toString();
};

const getFotoSrc = (product) => {
  if (!product) return null;
  const raw =
    product.fotoUrl ||
    (product.aanmeldingId
      ? `/api/Aanmeldingen/${product.aanmeldingId}/foto`
      : null);
  return normalizeFotoUrl(raw);
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
        veilingProductId: vp.veilingProductId ?? vp.VeilingProductId,
        aanmeldingId: vp.aanmeldingId ?? vp.AanmeldingId,
        productBeschrijving:
          vp.productBeschrijving ?? vp.ProductBeschrijving ?? "",
        hoeveelheid: hoeveelheid ?? 0,
        resterendAantal,
        minimumPrijs: vp.startPrijs ?? vp.StartPrijs ?? 0,
        fotoUrl: normalizeFotoUrl(vp.fotoUrl ?? vp.FotoUrl ?? null),
        kloklocatie: vp.kloklocatie ?? vp.Kloklocatie ?? "",
        categorie: vp.categorie ?? vp.Categorie ?? "",
        gewensteVeilDatum:
          vp.gewensteVeilDatum ?? vp.GewensteVeilDatum ?? null,
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
  // UI state: loading flags + fouten/feedback.
  const [loading, setLoading] = useState(true);
  const [loadingVeiling, setLoadingVeiling] = useState(false);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [err, setErr] = useState("");
  const [koopMsg, setKoopMsg] = useState("");

  // "nowMs" wordt elke seconde bijgewerkt voor timers/labels (clock, starttijd, etc.).
  const [nowMs, setNowMs] = useState(Date.now());

  const [actieveVeilingen, setActieveVeilingen] = useState([]);
  const [selectedVeilingId, setSelectedVeilingId] = useState(null);
  const selectedVeilingIdRef = React.useRef(null);
  const soldOutNotifiedRef = React.useRef(new Set());
  const [veiling, setVeiling] = useState(null);
  const [koopAantal, setKoopAantal] = useState("");
  const [remainingQty, setRemainingQty] = useState(null);
  const [clockRunId, setClockRunId] = useState(1);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [showStartInfo, setShowStartInfo] = useState(false);
  const [clockFinished, setClockFinished] = useState(false);
  const [endedNotice, setEndedNotice] = useState(null);
  const [fotoError, setFotoError] = useState(false);

  const [myPurchases, setMyPurchases] = useState([]);

  // Popup: state voor historische prijzen (open, loading, error, data)
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyErr, setHistoryErr] = useState("");
  const [historyData, setHistoryData] = useState(null);
  const historyCloseBtnRef = React.useRef(null);

  // tab: "veilingen" | "aankopen"
  const [activeTab, setActiveTab] = useState("veilingen");

  // categorie-filter
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

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
    // Init: bij eerste render laad actieve veilingen + eigen aankopen (data komt via API).
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

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    selectedVeilingIdRef.current = selectedVeilingId;
  }, [selectedVeilingId]);

  function pushMessage(type, text, details) {
    // Globale notificaties (bovenin in Layout) via custom events.
    const time = new Date().toLocaleTimeString("nl-NL", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const cleanDetails =
      Array.isArray(details) && details.length > 0 ? details : null;
    if (typeof window !== "undefined") {
      const payload = { count: 1, text, type, time };
      if (cleanDetails) payload.details = cleanDetails;
      window.dispatchEvent(
        new CustomEvent("floraflow:notify", {
          detail: payload,
        })
      );
    }
  }

  async function loadActieveVeilingen() {
    // Read-flow:
    // frontend -> GET /api/Veilingen -> filter/sort client-side -> render lijst links.
    try {
      const alle = await apiFetch("/Veilingen");
      const lijst = Array.isArray(alle) ? alle : [];

      let actief = lijst.filter(
        (v) =>
          v.status &&
          typeof v.status === "string" &&
          v.status.toLowerCase() === "actief"
      );

      const now = Date.now();
      actief = actief.filter((v) => {
        const endMs = toTimeMs(v.eindTijd);
        return !Number.isFinite(endMs) || endMs >= now;
      });

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
        (a, b) => toTimeMs(b.startTijd) - toTimeMs(a.startTijd)
      );

      setActieveVeilingen(actief);

      const selectedId = selectedVeilingIdRef.current;
      if (
        selectedId &&
        !actief.some((v) => (v.veilingId ?? v.id) === selectedId)
      ) {
        const last = veiling;
        const lastName =
          last?.naam ?? (selectedId ? `Veiling #${selectedId}` : "Veiling");
        const lastStart = last?.startTijd
          ? fmtDateTime(last.startTijd)
          : null;
        const lastProduct =
          last?.huidigProduct?.productBeschrijving ?? null;

        setEndedNotice({
          title: "Veiling is voorbij",
          name: lastName,
          startedAt: lastStart,
          product: lastProduct,
        });
        setSelectedVeilingId(null);
        setVeiling(null);
        setRemainingQty(null);
        setCurrentPrice(null);
        setKoopMsg("De veiling is afgelopen of uitverkocht.");
      }

      if (!selectedId && actief.length > 0) {
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
          toTimeMs(b.datum ?? b.Datum) - toTimeMs(a.datum ?? a.Datum)
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
    setEndedNotice(null);
    setClockFinished(false);
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
      setShowStartInfo(false);
      setClockFinished(false);
      setClockRunId((n) => n + 1);
    } catch (e) {
      setErr(e?.message ?? "Kon veiling niet laden.");
    } finally {
      setLoadingVeiling(false);
    }
  }

  async function refreshSelectedVeiling(id) {
    if (!id) return;
    try {
      const v = await apiFetch(`/Veilingen/${id}`);
      if (!v) return;
      const { mappedVeiling, availableQty } = mapVeilingDto(v);
      setVeiling(mappedVeiling);
      setRemainingQty(availableQty);
      return availableQty;
    } catch {
      // stil falen
    }
  }

  function handleClockPriceChange(price) {
    setCurrentPrice(price);
    if (clockFinished) {
      setClockFinished(false);
    }
  }

  function handleClockFinished() {
    setCurrentPrice(null);
    setClockFinished(true);
    setKoopMsg("De klok is gestopt. Wacht op de volgende ronde of veiling.");
    pushMessage("info", "De klok is gestopt voor deze veiling.");
  }

  // Popup: sluit met ESC
  useEffect(() => {
    if (!showHistory) return;
    historyCloseBtnRef.current?.focus();
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
    const id = setInterval(refresh, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [activeTab, selectedVeilingId]);

  useEffect(() => {
    if (activeTab !== "veilingen") return;
    const id = setInterval(loadActieveVeilingen, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function handleKoop(e) {
    e.preventDefault();
    const product = veiling?.huidigProduct;
    if (!product || !veiling) return;

    setKoopMsg("");

    const startMs = toTimeMs(veiling.startTijd);
    if (Number.isFinite(startMs) && nowMs < startMs) {
      setKoopMsg(
        `Deze veiling is nog niet live. Start op ${fmtDateTime(
          veiling.startTijd
        )}.`
      );
      pushMessage(
        "warning",
        `Veiling is nog niet live. Start op ${fmtDateTime(veiling.startTijd)}.`
      );
      return;
    }

    if (!koperId) {
      setKoopMsg("Je moet ingelogd zijn als koper om te kunnen kopen.");
      pushMessage("error", "Je moet ingelogd zijn om te kunnen kopen.");
      return;
    }

    if (currentPrice == null) {
      setKoopMsg("Wacht tot de klok loopt voordat je kunt kopen.");
      pushMessage("info", "Wacht tot de klok loopt voordat je kunt kopen.");
      return;
    }

    if (remainingQty != null && remainingQty <= 0) {
      setKoopMsg("Dit product is uitverkocht.");
      pushMessage("info", "Dit product is uitverkocht.");
      return;
    }

    const qty = Number(String(koopAantal).replace(",", "."));
    if (!qty || qty <= 0) {
      setKoopMsg("Voer een geldig aantal in.");
      pushMessage("warning", "Voer een geldig aantal in.");
      return;
    }

    if (remainingQty != null && qty > remainingQty) {
      setKoopMsg(
        `Er zijn nog maar ${remainingQty} stuks beschikbaar voor dit product.`
      );
      pushMessage(
        "warning",
        `Er zijn nog maar ${remainingQty} stuks beschikbaar.`
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
      pushMessage(
        "success",
        `Aankoop gelukt: ${qty} stuks voor EUR ${fmtCurrency(
          currentPrice
        )} per stuk.`
      );

      if (remainingQty != null) {
        setRemainingQty(Math.max(0, remainingQty - qty));
      }

      setKoopAantal("");
      await loadMyPurchases();

      const updatedRemaining = await refreshSelectedVeiling(selectedVeilingId);
      await loadActieveVeilingen();
      if (updatedRemaining === 0) {
        setKoopMsg(
          "Je aankoop is verwerkt. Dit product is nu uitverkocht; de veiling is gestopt."
        );
      }
    } catch (e2) {
      const message =
        e2?.message ?? "Er ging iets mis bij het registreren van de aankoop.";
      setKoopMsg(message);
      pushMessage("error", message);
    }
  }

  const product = veiling?.huidigProduct ?? null;
  useEffect(() => {
    setFotoError(false);
  }, [veiling?.veilingId, product?.veilingProductId, product?.fotoUrl]);
  const effectiveRemaining =
    remainingQty ?? product?.resterendAantal ?? product?.hoeveelheid ?? null;
  const isSoldOut =
    typeof effectiveRemaining === "number" ? effectiveRemaining <= 0 : false;
  const selectedStartMs = toTimeMs(veiling?.startTijd);
  const isVeilingLive = Number.isFinite(selectedStartMs)
    ? selectedStartMs <= nowMs
    : true;
  const veilingStartLabel = veiling?.startTijd
    ? fmtDateTime(veiling.startTijd)
    : "-";
  const veilingDatumLabel = product?.gewensteVeilDatum
    ? fmtDate(product.gewensteVeilDatum)
    : fmtDate(veiling?.startTijd);

  useEffect(() => {
    if (!isSoldOut) return;
    const id = veiling?.veilingId;
    if (!id) return;
    if (soldOutNotifiedRef.current.has(id)) return;
    soldOutNotifiedRef.current.add(id);
    pushMessage(
      "info",
      "Veiling is voorbij. Alle beschikbare producten zijn verkocht."
    );
  }, [isSoldOut, veiling?.veilingId]);
  const showEndedPanel = clockFinished || isSoldOut;
  const endedReason = isSoldOut
    ? "Alle producten zijn verkocht."
    : "De klok is gestopt voor deze veiling.";

  const productInfo = useMemo(
    () => splitProductDescription(product?.productBeschrijving),
    [product?.productBeschrijving]
  );
  const fotoSrc = useMemo(() => getFotoSrc(product), [product]);

  const { minPrice, maxPrice, durationSeconds } = useMemo(() => {
    if (!product) {
      return { minPrice: 0, maxPrice: 0, durationSeconds: 60 };
    }
    const min = Number(product.minimumPrijs ?? 0);
    const max = min > 0 ? min * 2 : 100;
    const startMs = toTimeMs(veiling?.startTijd);
    const endMs = toTimeMs(veiling?.eindTijd);
    const durationFromBackend =
      Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
        ? Math.round((endMs - startMs) / 1000)
        : 60;
    const duration = Math.max(1, durationFromBackend);
    return { minPrice: min, maxPrice: max, durationSeconds: duration };
  }, [product, veiling?.startTijd, veiling?.eindTijd]);

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
    let list = actieveVeilingen;
    if (categoryFilter !== "ALL") {
      list = list.filter((v) => v.categorie === categoryFilter);
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) return list;

    return list.filter((v) => {
      const first =
        v.veilingProducten && v.veilingProducten.length > 0
          ? v.veilingProducten[0]
          : v.huidigProduct ?? null;
      const haystack = [
        v.categorie,
        v.naam,
        first?.productBeschrijving,
        first?.productNaam,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [actieveVeilingen, categoryFilter, searchQuery]);

  const handlePickAnother = () => {
    setEndedNotice(null);
    setClockFinished(false);
    const first = filteredAuctions[0];
    if (first) {
      selectVeilingById(first.veilingId ?? first.id);
    }
  };

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

      <section className="kop-search-block" aria-label="Zoeken">
        <h3 className="kop-search-title">Zoeken</h3>
        <label htmlFor="kopSearch" className="kop-filter-label">
          Zoek op categorie, product of beschrijving
        </label>
        <input
          id="kopSearch"
          type="search"
          className="kop-filter-input"
          placeholder="Bijv. rozen, kamerplanten, 60 cm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </section>

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
                  {searchQuery.trim()
                    ? "Geen veilingen gevonden voor deze zoekterm."
                    : `Er zijn momenteel geen actieve veilingen${
                        categoryFilter !== "ALL"
                          ? " in deze categorie."
                          : "."
                      }`}
                </p>
              ) : (
                <div className="kop-veiling-list">
                  {filteredAuctions.map((v) => {
                    const id = v.veilingId ?? v.id;
                    const isActive = id === selectedVeilingId;
                    const startMs = toTimeMs(v.startTijd);
                    const isLive = Number.isFinite(startMs)
                      ? startMs <= nowMs
                      : true;
                    const p =
                      v.veilingProducten && v.veilingProducten.length > 0
                        ? v.veilingProducten[0]
                        : null;
                    const pInfo = p
                      ? splitProductDescription(p.productBeschrijving)
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
                        <div className="kop-veiling-meta kop-veiling-meta--row">
                          <span>
                            {isLive ? "Gestart op" : "Start op"}{" "}
                            {fmtDateTime(v.startTijd)}
                          </span>
                          {!isLive && (
                            <span className="kop-live-pill kop-live-pill--offline">
                              Niet live
                            </span>
                          )}
                        </div>
                        {p && (
                          <div className="kop-veiling-prod">
                            <div className="kop-veiling-prod-title">
                              {pInfo?.title ?? "-"}
                            </div>
                            {(pInfo?.lines?.length ?? 0) > 0 && (
                              <div className="kop-veiling-prod-lines">
                                {pInfo.lines.slice(0, 2).join(" - ")}
                              </div>
                            )}
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
                endedNotice ? (
                  <div className="kop-end-empty" role="status">
                    <h3>{endedNotice.title}</h3>
                    <p className="kop-end-meta">{endedNotice.name}</p>
                    {endedNotice.product && (
                      <p className="kop-end-meta">
                        Product: {endedNotice.product}
                      </p>
                    )}
                    {endedNotice.startedAt && (
                      <p className="kop-end-meta">
                        Gestart op {endedNotice.startedAt}
                      </p>
                    )}
                    <p className="kop-end-note">
                      Dank u voor uw mededeling.
                    </p>
                    <div className="kop-end-actions">
                      <button
                        type="button"
                        className="kop-koop-btn kop-koop-btn--ghost"
                        onClick={handlePickAnother}
                        disabled={filteredAuctions.length === 0}
                      >
                        Kies andere veiling
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="kop-extra-text">
                    Kies links een veiling om de details te zien en te kunnen
                    kopen.
                  </p>
                )
              ) : (
                <div className="kop-detail-card">
                  {showEndedPanel && (
                    <div className="kop-end-card" role="status">
                      <h3>Veiling is voorbij</h3>
                      <p className="kop-end-meta">{endedReason}</p>
                      <p className="kop-end-note">
                        Dank u voor uw mededeling.
                      </p>
                      <div className="kop-end-actions">
                        <button
                          type="button"
                          className="kop-koop-btn kop-koop-btn--ghost"
                          onClick={handlePickAnother}
                          disabled={filteredAuctions.length === 0}
                        >
                          Kies andere veiling
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Product-informatie */}
                  <div className="kop-detail-left">
                    <p className="kop-extra-text">
                      Veiling #{veiling.veilingId} -{" "}
                      {isVeilingLive ? "gestart op" : "start op"}{" "}
                      {veilingStartLabel}
                    </p>
                    <h2 className="kop-veiling-title">
                      {veiling.naam ?? `Veiling #${veiling.veilingId}`}
                    </h2>

                    <h3 className="kop-prod-title">{productInfo.title}</h3>
                    {productInfo.lines.length > 0 && (
                      <ul className="kop-prod-lines">
                        {productInfo.lines.map((line, idx) => (
                          <li key={`${line}-${idx}`}>{line}</li>
                        ))}
                      </ul>
                    )}
                    {!hideMinPrice && (
                      <p className="kop-min-price">
                        Minimale prijs: EUR {fmtCurrency(product.minimumPrijs)}
                      </p>
                    )}

                    {fotoSrc && !fotoError ? (
                      <img
                        src={fotoSrc}
                        alt={productInfo.title}
                        className="kop-prod-img"
                        loading="lazy"
                        onError={() => setFotoError(true)}
                      />
                    ) : (
                      <div className="kop-prod-img kop-prod-img--placeholder">
                        Geen foto beschikbaar
                      </div>
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
                          {effectiveRemaining != null
                            ? `${effectiveRemaining} stuks`
                            : "-"}
                        </dd>
                      </div>

                      <div>
                        <dt>Veildatum</dt>
                        <dd>{veilingDatumLabel}</dd>
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
                    <div className="kop-clock-box">
                      {isSoldOut ? (
                        <div className="kop-clock-placeholder">
                          <div className="kop-notlive-row">
                            <span className="kop-live-pill kop-live-pill--offline">
                              Uitverkocht
                            </span>
                          </div>
                          <p className="kop-extra-text kop-soldout-text">
                            Er zijn geen artikelen meer beschikbaar. De veiling is gestopt.
                          </p>
                        </div>
                      ) : !isVeilingLive ? (
                        <div className="kop-clock-placeholder">
                          <div className="kop-notlive-row">
                            <span className="kop-live-pill kop-live-pill--offline">
                              Niet live
                            </span>
                            <button
                              type="button"
                              className="kop-info-btn"
                              aria-label="Toon startmoment"
                              onClick={() =>
                                setShowStartInfo((v) => !v)
                              }
                            >
                              i
                            </button>
                          </div>

                          {showStartInfo && (
                            <div
                              className="kop-startinfo-popover"
                              role="dialog"
                              aria-label="Startmoment van de veiling"
                            >
                              <p className="kop-startinfo-title">
                                Deze veiling start op:
                              </p>
                              <p className="kop-startinfo-datetime">
                                {veilingStartLabel}
                              </p>
                              <button
                                type="button"
                                className="kop-koop-btn kop-koop-btn--ghost kop-startinfo-close"
                                onClick={() => setShowStartInfo(false)}
                              >
                                Sluiten
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <AuctionClock
                          minPrice={minPrice}
                          maxPrice={maxPrice}
                          durationSeconds={durationSeconds}
                          startTime={veiling?.startTijd}
                          runId={clockRunId}
                          onPriceChange={handleClockPriceChange}
                          onFinished={handleClockFinished}
                        />
                      )}
                    </div>

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

                      <button
                        type="submit"
                        className="kop-koop-btn"
                        disabled={!isVeilingLive || isSoldOut || currentPrice == null}
                      >
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
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowHistory(false);
          }}
          role="presentation"
        >
          <div
            className="kop-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="kop-history-title"
            aria-describedby="kop-history-desc"
          >
            <div className="kop-modal-header">
              <div>
                <h3 id="kop-history-title">Historische prijzen</h3>
                <p id="kop-history-desc" className="kop-modal-sub">
                  Inzicht in eerdere prijzen voor deze bloemsoort.
                </p>
              </div>
              <button
                type="button"
                className="kop-koop-btn kop-koop-btn--ghost"
                onClick={() => setShowHistory(false)}
                ref={historyCloseBtnRef}
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
