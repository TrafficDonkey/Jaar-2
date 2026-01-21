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

const REKENING_BUYER_PREMIUM_RATE = 0.05;
const REKENING_VAT_RATE = 0.21;
const REKENING_SHIPPING_OPTIONS = [
  { id: "standaard", label: "Standaard (2-3 werkdagen)", cost: 6.95 },
  { id: "express", label: "Express (volgende werkdag)", cost: 12.95 },
];

const padDigits = (value, size) => {
  const raw = String(value ?? "");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  return digits.padStart(size, "0");
};

const buildInvoiceNumber = (koperId, purchaseId, datum) => {
  const year = (() => {
    const ms = toTimeMs(datum);
    if (!Number.isFinite(ms)) return new Date().getFullYear();
    return new Date(ms).getFullYear();
  })();
  const koperPart = padDigits(koperId ?? "0", 4);
  const idPart = padDigits(purchaseId ?? "0", 6);
  return `FF-${year}-${koperPart}-${idPart}`;
};

const normalizeHistoryRow = (row) => {
  if (!row) return null;
  const prijs = Number(row.prijsPerBloem ?? row.PrijsPerBloem);
  if (!Number.isFinite(prijs)) return null;
  return {
    aanvoerderNaam: row.aanvoerderNaam ?? row.AanvoerderNaam ?? "-",
    datum: row.datum ?? row.Datum ?? null,
    prijs,
  };
};

const PriceHistoryChart = ({ title, rows }) => {
  const normalized = Array.isArray(rows)
    ? rows.map(normalizeHistoryRow).filter(Boolean)
    : [];

  if (normalized.length < 2) {
    return (
      <div className="kop-chart kop-chart--empty" aria-label={title}>
        <p className="kop-extra-text">Niet genoeg data voor een grafiek.</p>
      </div>
    );
  }

  // Backend geeft nieuwste eerst; voor een logische x-as draaien we om (oud → nieuw).
  const points = [...normalized].reverse();

  const width = 720;
  const height = 220;
  const margin = { top: 16, right: 16, bottom: 34, left: 62 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const prices = points.map((p) => p.prijs);

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = Math.max(1e-9, max - min);
  const pad = range * 0.12;
  const yMin = Math.max(0, min - pad);
  const yMax = max + pad;
  const yRange = Math.max(1e-9, yMax - yMin);

  const xAt = (idx) => {
    if (points.length === 1) return margin.left + innerW / 2;
    return margin.left + (idx / (points.length - 1)) * innerW;
  };
  const yAt = (val) => margin.top + ((yMax - val) / yRange) * innerH;

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(p.prijs)}`)
    .join(" ");

  const tickValues = [yMin, (yMin + yMax) / 2, yMax];
  const xLabels = points.map((_, i) => i + 1);

  return (
    <div className="kop-chart" role="img" aria-label={title}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="kop-chart-svg"
        aria-hidden="true"
      >
        {/* grid + y labels */}
        {tickValues.map((v, idx) => {
          const y = yAt(v);
          return (
            <g key={idx}>
              <line
                x1={margin.left}
                y1={y}
                x2={width - margin.right}
                y2={y}
                className="kop-chart-grid"
              />
              <text x={margin.left - 10} y={y + 4} className="kop-chart-ytext">
                € {fmtCurrency(v)}
              </text>
            </g>
          );
        })}

        {/* axes */}
        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={height - margin.bottom}
          className="kop-chart-axis"
        />
        <line
          x1={margin.left}
          y1={height - margin.bottom}
          x2={width - margin.right}
          y2={height - margin.bottom}
          className="kop-chart-axis"
        />

        {/* line */}
        <path d={path} className="kop-chart-line" fill="none" />

        {/* points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={xAt(i)}
              cy={yAt(p.prijs)}
              r="4"
              className="kop-chart-point"
            >
              <title>
                #{i + 1} · {fmtDate(p.datum)} · € {fmtCurrency(p.prijs)}
              </title>
            </circle>
          </g>
        ))}

        {/* x labels */}
        {xLabels.map((lbl, i) => (
          <text
            key={i}
            x={xAt(i)}
            y={height - 12}
            textAnchor="middle"
            className="kop-chart-xtext"
          >
            {lbl}
          </text>
        ))}
      </svg>
    </div>
  );
};

const cleanText = (value) => {
  const txt = String(value ?? "").replace(/\r?\n/g, " ").trim();
  return txt || "-";
};

const getVeilingId = (v) => {
  const id = v?.veilingId ?? v?.id;
  const nr = Number(id);
  return Number.isFinite(nr) ? nr : null;
};

const isLiveVeilingAt = (v, nowMs) => {
  const startMs = toTimeMs(v?.startTijd);
  return Number.isFinite(startMs) ? startMs <= nowMs : true;
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
  const hasEverSelectedRef = React.useRef(false);
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

  // tab: "veilingen" | "opgeslagen" | "aankopen" | "rekening"
  const [activeTab, setActiveTab] = useState("veilingen");
  const [purchaseSort, setPurchaseSort] = useState("date_desc");

  // Rekening (demo): openstaande facturen + geschiedenis
  const [rekeningTab, setRekeningTab] = useState("open");
  const [rekeningDemo, setRekeningDemo] = useState({});
  const [rekeningLoaded, setRekeningLoaded] = useState(false);
  const [checkoutInvoiceId, setCheckoutInvoiceId] = useState(null);
  const [checkoutPrefillMsg, setCheckoutPrefillMsg] = useState("");
  const [checkoutErr, setCheckoutErr] = useState("");
  const [checkoutFieldErrors, setCheckoutFieldErrors] = useState({});
  const [checkoutForm, setCheckoutForm] = useState({
    levering: "bezorgen", // "bezorgen" | "ophalen"
    verzendmethode: "standaard", // "standaard" | "express"
    straat: "",
    huisnummer: "",
    postcode: "",
    plaats: "",
    toevoeging: "",
    opmerkingen: "",
  });

  // bookmarks (Klant/Koper): opgeslagen veilingen
  const [bookmarkedVeilingIds, setBookmarkedVeilingIds] = useState([]);
  const bookmarkNotified30Ref = React.useRef(new Set());
  const bookmarkNotified5Ref = React.useRef(new Set());

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
  const canBuy = role === "Klant" || role === "Koper" || role === "Admin";
  const canBookmark = role === "Klant" || role === "Koper";
  const hideMinPrice = false;
  const isAdmin = role === "Admin";
  const isAuctionTab = activeTab === "veilingen" || activeTab === "opgeslagen";

  const bookmarkStorageKey = `floraflow:koperBookmarks:${
    koperId ? String(koperId) : "anon"
  }`;
  const bookmarkNotifStorageKey = `floraflow:koperBookmarkNotifs:${
    koperId ? String(koperId) : "anon"
  }`;
  const rekeningStorageKey = `floraflow:rekeningDemo:${
    koperId ? String(koperId) : "anon"
  }`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    setRekeningLoaded(false);
    try {
      const raw = window.localStorage.getItem(rekeningStorageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      setRekeningDemo(parsed && typeof parsed === "object" ? parsed : {});
    } catch {
      setRekeningDemo({});
    } finally {
      setRekeningLoaded(true);
    }
  }, [rekeningStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!rekeningLoaded) return;
    try {
      window.localStorage.setItem(
        rekeningStorageKey,
        JSON.stringify(rekeningDemo)
      );
    } catch {
      // ignore
    }
  }, [rekeningDemo, rekeningStorageKey, rekeningLoaded]);

  useEffect(() => {
    // Init: bij eerste render laad actieve veilingen + eigen aankopen (data komt via API).
    document.title = "Koper - FloraFlow";
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const tasks = [loadActieveVeilingen()];
        if (canBuy) tasks.push(loadMyPurchases());
        await Promise.all(tasks);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if ((activeTab === "aankopen" || activeTab === "rekening") && !canBuy) {
      setActiveTab("veilingen");
    }
  }, [activeTab, canBuy]);

  useEffect(() => {
    if (activeTab === "opgeslagen" && !canBookmark) {
      setActiveTab("veilingen");
    }
  }, [activeTab, canBookmark]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(bookmarkStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(parsed)
        ? parsed
            .map((v) => Number(v))
            .filter((v) => Number.isFinite(v))
        : [];
      setBookmarkedVeilingIds(Array.from(new Set(list)));
    } catch {
      setBookmarkedVeilingIds([]);
    }
  }, [bookmarkStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        bookmarkStorageKey,
        JSON.stringify(bookmarkedVeilingIds)
      );
    } catch {
      // ignore
    }
  }, [bookmarkedVeilingIds, bookmarkStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(bookmarkNotifStorageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || typeof parsed !== "object") return;

      const m30 = new Set();
      const m5 = new Set();

      for (const [key, value] of Object.entries(parsed)) {
        const id = Number(key);
        if (!Number.isFinite(id)) continue;
        if (value && typeof value === "object") {
          if (value.m30) m30.add(id);
          if (value.m5) m5.add(id);
        }
      }

      bookmarkNotified30Ref.current = m30;
      bookmarkNotified5Ref.current = m5;
    } catch {
      // ignore
    }
  }, [bookmarkNotifStorageKey]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    selectedVeilingIdRef.current = selectedVeilingId;
  }, [selectedVeilingId]);

  useEffect(() => {
    if (activeTab !== "opgeslagen") return;
    if (!selectedVeilingId) return;

    const selectedId = Number(selectedVeilingId);
    const stillBookmarked = bookmarkedVeilingIds.some(
      (v) => Number(v) === selectedId
    );
    if (stillBookmarked) return;

    setSelectedVeilingId(null);
    setVeiling(null);
    setRemainingQty(null);
    setCurrentPrice(null);
    setKoopMsg("");
    setEndedNotice(null);
    setClockFinished(false);
  }, [activeTab, bookmarkedVeilingIds, selectedVeilingId]);

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

  useEffect(() => {
    if (!checkoutInvoiceId) return;

    setCheckoutErr("");
    setCheckoutFieldErrors({});
    setCheckoutPrefillMsg("");

    const saved = rekeningDemo?.[checkoutInvoiceId]?.levering ?? null;
    setCheckoutForm({
      levering: saved?.type ?? "bezorgen",
      verzendmethode: saved?.verzendmethode ?? "standaard",
      straat: saved?.straat ?? "",
      huisnummer: saved?.huisnummer ?? "",
      postcode: saved?.postcode ?? "",
      plaats: saved?.plaats ?? "",
      toevoeging: saved?.toevoeging ?? "",
      opmerkingen: saved?.opmerkingen ?? "",
    });

    let cancelled = false;

    (async () => {
      if (!koperId) return;
      try {
        const g = await apiFetch(`/Gebruikers/${koperId}`);
        if (cancelled) return;

        const straat = String(g?.adresStraat ?? "").trim();
        const huisnummer = String(g?.huisnummer ?? "").trim();
        const postcode = String(g?.postcode ?? "").trim();

        if (!straat && !huisnummer && !postcode) return;

        setCheckoutForm((prev) => {
          if (prev.straat || prev.huisnummer || prev.postcode) return prev;
          return {
            ...prev,
            straat: straat || prev.straat,
            huisnummer: huisnummer || prev.huisnummer,
            postcode: postcode || prev.postcode,
          };
        });
        setCheckoutPrefillMsg(
          "Adres is alvast ingevuld vanuit je instellingen."
        );
      } catch {
        // ignore: demo mag ook zonder profiel-adres werken
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [checkoutInvoiceId, koperId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab !== "rekening" && checkoutInvoiceId) {
      setCheckoutInvoiceId(null);
      setCheckoutErr("");
      setCheckoutFieldErrors({});
      setCheckoutPrefillMsg("");
    }
  }, [activeTab, checkoutInvoiceId]);

  const bookmarkedSet = useMemo(
    () => new Set(bookmarkedVeilingIds.map((v) => Number(v))),
    [bookmarkedVeilingIds]
  );

  const persistBookmarkNotifState = React.useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const payload = {};
      for (const id of new Set([
        ...bookmarkNotified30Ref.current,
        ...bookmarkNotified5Ref.current,
      ])) {
        payload[String(id)] = {
          m30: bookmarkNotified30Ref.current.has(id),
          m5: bookmarkNotified5Ref.current.has(id),
        };
      }
      window.localStorage.setItem(
        bookmarkNotifStorageKey,
        JSON.stringify(payload)
      );
    } catch {
      // ignore
    }
  }, [bookmarkNotifStorageKey]);

  const toggleBookmark = (veilingId) => {
    const id = Number(veilingId);
    if (!Number.isFinite(id)) return;
    if (!canBookmark) return;

    setBookmarkedVeilingIds((prev) => {
      const has = prev.some((v) => Number(v) === id);
      if (has) {
        bookmarkNotified30Ref.current.delete(id);
        bookmarkNotified5Ref.current.delete(id);
        persistBookmarkNotifState();
        pushMessage("info", "Veiling verwijderd uit opgeslagen.");
        return prev.filter((v) => Number(v) !== id);
      }
      pushMessage("success", "Veiling opgeslagen.");
      return [...prev, id];
    });
  };

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
        if (!hasEverSelectedRef.current) {
          selectVeilingById(actief[0].veilingId);
        }
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
    hasEverSelectedRef.current = true;

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
    if (!isAuctionTab || !selectedVeilingId) return;
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
  }, [isAuctionTab, selectedVeilingId]);

  useEffect(() => {
    if (!isAuctionTab) return;
    const id = setInterval(loadActieveVeilingen, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuctionTab]);

  useEffect(() => {
    if (!canBookmark) return;
    if (bookmarkedVeilingIds.length === 0) return;
    if (!Array.isArray(actieveVeilingen) || actieveVeilingen.length === 0) return;

    const now = nowMs;
    const thresh30 = 30 * 60 * 1000;
    const thresh5 = 5 * 60 * 1000;

    const mapById = new Map();
    for (const v of actieveVeilingen) {
      const id = v.veilingId ?? v.id;
      if (id != null) mapById.set(Number(id), v);
    }

    let changed = false;

    for (const id of bookmarkedVeilingIds) {
      const v = mapById.get(Number(id));
      if (!v) continue;
      const startMs = toTimeMs(v.startTijd);
      if (!Number.isFinite(startMs)) continue;

      const diff = startMs - now;
      if (diff <= 0) continue;

      if (diff <= thresh30 && !bookmarkNotified30Ref.current.has(Number(id))) {
        bookmarkNotified30Ref.current.add(Number(id));
        changed = true;
        pushMessage(
          "info",
          `Opgeslagen veiling "${v.naam ?? "Veiling"}" start over 30 minuten.`
        );
      }

      if (diff <= thresh5 && !bookmarkNotified5Ref.current.has(Number(id))) {
        bookmarkNotified5Ref.current.add(Number(id));
        changed = true;
        pushMessage(
          "warning",
          `Opgeslagen veiling "${v.naam ?? "Veiling"}" start over 5 minuten.`
        );
      }
    }

    if (changed) persistBookmarkNotifState();
  }, [
    actieveVeilingen,
    bookmarkedVeilingIds,
    canBookmark,
    nowMs,
    persistBookmarkNotifState,
  ]);

  async function handleKoop(e) {
    e.preventDefault();
    if (!canBuy) {
      setKoopMsg("Je kunt hier alleen de veiling volgen; kopen kan niet.");
      pushMessage(
        "info",
        "Alleen bekijken: kopen kan alleen met een klant-account."
      );
      return;
    }
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

  const bookmarkedAuctions = useMemo(() => {
    if (!canBookmark || bookmarkedSet.size === 0) return [];
    return actieveVeilingen.filter((v) => {
      const id = getVeilingId(v);
      return id != null && bookmarkedSet.has(id);
    });
  }, [actieveVeilingen, bookmarkedSet, canBookmark]);

  const auctionsForTab = useMemo(() => {
    if (activeTab === "opgeslagen") return bookmarkedAuctions;
    if (activeTab === "veilingen") return filteredAuctions;
    return [];
  }, [activeTab, bookmarkedAuctions, filteredAuctions]);

  const liveAuctions = useMemo(
    () => auctionsForTab.filter((v) => isLiveVeilingAt(v, nowMs)),
    [auctionsForTab, nowMs]
  );

  const notLiveAuctions = useMemo(
    () => auctionsForTab.filter((v) => !isLiveVeilingAt(v, nowMs)),
    [auctionsForTab, nowMs]
  );

  const sortedPurchases = useMemo(() => {
    const list = Array.isArray(myPurchases) ? [...myPurchases] : [];

    const getTime = (t) => {
      const ms = toTimeMs(t?.datum ?? t?.Datum);
      return Number.isFinite(ms) ? ms : 0;
    };

    const getCat = (t) => cleanText(t?.categorie ?? t?.Categorie);

    switch (purchaseSort) {
      case "date_asc":
        list.sort((a, b) => getTime(a) - getTime(b));
        break;
      case "cat_az":
        list.sort((a, b) =>
          getCat(a).localeCompare(getCat(b), "nl-NL", { sensitivity: "base" })
        );
        break;
      case "cat_za":
        list.sort((a, b) =>
          getCat(b).localeCompare(getCat(a), "nl-NL", { sensitivity: "base" })
        );
        break;
      case "date_desc":
      default:
        list.sort((a, b) => getTime(b) - getTime(a));
        break;
    }

    return list;
  }, [myPurchases, purchaseSort]);

  const paidPurchaseIds = useMemo(() => {
    const set = new Set();
    if (!rekeningDemo || typeof rekeningDemo !== "object") return set;
    for (const [key, value] of Object.entries(rekeningDemo)) {
      if (value && value.status === "betaald") {
        set.add(String(key));
      }
    }
    return set;
  }, [rekeningDemo]);

  const invoices = useMemo(() => {
    const list = Array.isArray(myPurchases) ? myPurchases : [];

    return list.map((t, idx) => {
      const rawId = t?.toewijzingId ?? t?.ToewijzingId ?? idx + 1;
      const id = String(rawId);
      const datum = t?.datum ?? t?.Datum ?? null;
      const eindPrijs = Number(t?.eindPrijs ?? t?.EindPrijs ?? 0);
      const aantal = Number(t?.aantal ?? t?.Aantal ?? 1);
      const subtotal = (Number.isFinite(eindPrijs) ? eindPrijs : 0) * (Number.isFinite(aantal) ? aantal : 1);

      const categorie = cleanText(t?.categorie ?? t?.Categorie);
      const beschrijving = cleanText(t?.productBeschrijving ?? t?.ProductBeschrijving);
      const aanvoerderNaam = cleanText(t?.aanvoerderNaam ?? t?.AanvoerderNaam);
      const aanvoerderIdRaw = t?.aanvoerderId ?? t?.AanvoerderId ?? null;
      const aanvoerderIdNr = Number(aanvoerderIdRaw);
      const aanvoerderId = Number.isFinite(aanvoerderIdNr) ? aanvoerderIdNr : null;

      const demo = rekeningDemo?.[id] ?? null;
      const status = demo?.status === "betaald" ? "betaald" : "open";
      const levering = demo?.levering ?? null;
      const shippingKnown =
        typeof levering?.verzendkosten === "number" &&
        Number.isFinite(levering.verzendkosten);
      const shippingCost = shippingKnown ? Number(levering.verzendkosten) : null;

      const buyerPremium = subtotal * REKENING_BUYER_PREMIUM_RATE;
      const exVat = subtotal + buyerPremium + (shippingCost ?? 0);
      const vat = exVat * REKENING_VAT_RATE;
      const total = exVat + vat;

      return {
        id,
        invoiceNumber: buildInvoiceNumber(koperId, id, datum),
        status,
        datum,
        aanvoerderNaam,
        aanvoerderId,
        categorie,
        beschrijving,
        eindPrijs,
        aantal,
        amounts: {
          subtotal,
          buyerPremium,
          shippingCost,
          exVat,
          vat,
          total,
        },
        levering,
        betaaldOp: demo?.betaaldOp ?? null,
      };
    });
  }, [myPurchases, koperId, rekeningDemo]);

  const invoicesById = useMemo(() => {
    const map = new Map();
    for (const inv of invoices) {
      map.set(String(inv.id), inv);
    }
    return map;
  }, [invoices]);

  const openInvoices = useMemo(
    () => invoices.filter((i) => i.status !== "betaald"),
    [invoices]
  );
  const paidInvoices = useMemo(
    () => invoices.filter((i) => i.status === "betaald"),
    [invoices]
  );

  const handlePickAnother = () => {
    setEndedNotice(null);
    setClockFinished(false);
    setSelectedVeilingId(null);
    setVeiling(null);
    setRemainingQty(null);
    setCurrentPrice(null);
    setKoopMsg("");
  };

  // Popup: laad historische prijzen wanneer geopend
  useEffect(() => {
    if (!showHistory || !product?.veilingProductId) return;

    let cancelled = false;

    (async () => {
      setHistoryLoading(true);
      setHistoryErr("");
      setHistoryData(null);

      try {
        const fallbackTitle = splitProductDescription(
          product.productBeschrijving
        ).title;

        let requestedProductNaam = fallbackTitle;
        const looksLikeCategory =
          requestedProductNaam &&
          product.categorie &&
          requestedProductNaam.toLowerCase() ===
            String(product.categorie).toLowerCase();

        if (
          product.aanmeldingId &&
          (!requestedProductNaam ||
            requestedProductNaam === "-" ||
            looksLikeCategory)
        ) {
          const a = await apiFetch(`/Aanmeldingen/${product.aanmeldingId}`);
          if (cancelled) return;
          const aBeschrijving =
            a?.productBeschrijving ?? a?.ProductBeschrijving ?? "";
          const fromAanmelding = splitProductDescription(aBeschrijving).title;
          if (fromAanmelding && fromAanmelding !== "-") {
            requestedProductNaam = fromAanmelding;
          }
        }

        const qs =
          requestedProductNaam && requestedProductNaam !== "-"
            ? `?productNaam=${encodeURIComponent(requestedProductNaam)}`
            : "";

        const data = await apiFetch(
          `/VeilingProducts/${product.veilingProductId}/historische-prijzen${qs}`
        );
        if (cancelled) return;

        if (!data) {
          setHistoryData(null);
          return;
        }

        const normalized = {
          categorie: data.categorie ?? data.Categorie ?? "",
          productNaam:
            data.productNaam ?? data.ProductNaam ?? requestedProductNaam ?? "",
          aanvoerderNaam: data.aanvoerderNaam ?? data.AanvoerderNaam ?? "",
          laatste10Aanvoerder:
            data.laatste10Aanvoerder ?? data.Laatste10Aanvoerder ?? [],
          gemiddeldeAanvoerder:
            data.gemiddeldeAanvoerder ?? data.GemiddeldeAanvoerder ?? 0,
          laatste10Alle: data.laatste10Alle ?? data.Laatste10Alle ?? [],
          gemiddeldeAlle: data.gemiddeldeAlle ?? data.GemiddeldeAlle ?? 0,
        };

        setHistoryData(normalized);
      } catch (e) {
        setHistoryErr(e?.message ?? "Kon historische prijzen niet ophalen.");
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    showHistory,
    product?.veilingProductId,
    product?.productBeschrijving,
    product?.aanmeldingId,
    product?.categorie,
  ]);

  const hasAuctionsInTab = auctionsForTab.length > 0;

  const renderVeilingCard = (v) => {
    const id = getVeilingId(v);
    if (!id) return null;
    const isActive = id === selectedVeilingId;
    const isLive = isLiveVeilingAt(v, nowMs);
    const isBookmarked = bookmarkedSet.has(id);

    const p =
      v.veilingProducten && v.veilingProducten.length > 0
        ? v.veilingProducten[0]
        : null;
    const pInfo = p ? splitProductDescription(p.productBeschrijving) : null;

    const onSelect = () => selectVeilingById(id);

    return (
      <div
        key={id}
        role="button"
        tabIndex={0}
        className={
          "kop-veiling-card" + (isActive ? " kop-veiling-card--active" : "")
        }
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
      >
        <div className="kop-veiling-card-row">
          <strong>{v.naam ?? "Veiling"}</strong>
          {canBookmark && (
            <button
              type="button"
              className={
                "kop-bookmark-btn" +
                (isBookmarked ? " kop-bookmark-btn--active" : "")
              }
              aria-label={
                isBookmarked
                  ? "Verwijder uit opgeslagen"
                  : "Sla veiling op"
              }
              onClick={(e) => {
                e.stopPropagation();
                toggleBookmark(id);
              }}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M6 3h12a1 1 0 0 1 1 1v18l-7-4-7 4V4a1 1 0 0 1 1-1z" />
              </svg>
            </button>
          )}
        </div>

        {v.categorie && (
          <div className="kop-veiling-meta">Categorie: {v.categorie}</div>
        )}

        <div className="kop-veiling-meta kop-veiling-meta--row">
          <span>
            {isLive ? "Gestart op" : "Start op"} {fmtDateTime(v.startTijd)}
          </span>
          {!isLive && (
            <span className="kop-live-pill kop-live-pill--offline">
              Niet live
            </span>
          )}
        </div>

        {p && (
          <div className="kop-veiling-prod">
            <div className="kop-veiling-prod-title">{pInfo?.title ?? "-"}</div>
            {(pInfo?.lines?.length ?? 0) > 0 && (
              <div className="kop-veiling-prod-lines">
                {pInfo.lines.slice(0, 2).join(" - ")}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const checkoutInvoice = checkoutInvoiceId
    ? invoicesById.get(String(checkoutInvoiceId)) ?? null
    : null;

  const checkoutShippingOption =
    REKENING_SHIPPING_OPTIONS.find(
      (opt) => opt.id === checkoutForm.verzendmethode
    ) ?? REKENING_SHIPPING_OPTIONS[0];

  const checkoutShippingCost =
    checkoutForm.levering === "ophalen" ? 0 : checkoutShippingOption.cost;

  const checkoutSubtotal = checkoutInvoice?.amounts?.subtotal ?? 0;
  const checkoutBuyerPremium = checkoutSubtotal * REKENING_BUYER_PREMIUM_RATE;
  const checkoutExVat =
    checkoutSubtotal + checkoutBuyerPremium + checkoutShippingCost;
  const checkoutVat = checkoutExVat * REKENING_VAT_RATE;
  const checkoutTotal = checkoutExVat + checkoutVat;

  const closeCheckout = () => {
    setCheckoutInvoiceId(null);
    setCheckoutErr("");
    setCheckoutFieldErrors({});
    setCheckoutPrefillMsg("");
  };

  const validateCheckout = (form) => {
    const errors = {};
    const levering = String(form?.levering ?? "");
    if (levering === "bezorgen") {
      if (!String(form?.straat ?? "").trim()) {
        errors.straat = "Straat is verplicht.";
      }
      if (!String(form?.huisnummer ?? "").trim()) {
        errors.huisnummer = "Huisnummer is verplicht.";
      }
      if (!String(form?.postcode ?? "").trim()) {
        errors.postcode = "Postcode is verplicht.";
      }
      if (!String(form?.plaats ?? "").trim()) {
        errors.plaats = "Plaats is verplicht.";
      }
    }
    return errors;
  };

  const handleCheckoutConfirm = (event) => {
    event.preventDefault();
    setCheckoutErr("");

    if (!checkoutInvoice) {
      setCheckoutErr("Kon de factuur niet vinden. Probeer opnieuw.");
      return;
    }

    const errors = validateCheckout(checkoutForm);
    setCheckoutFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setCheckoutErr("Vul de verplichte velden in.");
      return;
    }

    const leveringType = checkoutForm.levering;
    const verzendkosten = leveringType === "ophalen" ? 0 : checkoutShippingCost;
    const verzendmethode =
      leveringType === "ophalen"
        ? "ophalen"
        : checkoutShippingOption?.id ?? "standaard";

    const levering = {
      type: leveringType,
      verzendmethode,
      verzendkosten,
      straat: String(checkoutForm.straat ?? "").trim(),
      huisnummer: String(checkoutForm.huisnummer ?? "").trim(),
      postcode: String(checkoutForm.postcode ?? "").trim(),
      plaats: String(checkoutForm.plaats ?? "").trim(),
      toevoeging: String(checkoutForm.toevoeging ?? "").trim(),
      opmerkingen: String(checkoutForm.opmerkingen ?? "").trim(),
    };

    const betaaldOp = new Date().toISOString();

    setRekeningDemo((prev) => ({
      ...(prev && typeof prev === "object" ? prev : {}),
      [String(checkoutInvoice.id)]: {
        ...(prev?.[String(checkoutInvoice.id)] ?? {}),
        status: "betaald",
        betaaldOp,
        levering,
      },
    }));

    const adresRegel = (() => {
      if (leveringType === "ophalen") return "Ophalen bij veilinghuis (demo)";
      const line1 = [levering.straat, levering.huisnummer, levering.toevoeging]
        .filter(Boolean)
        .join(" ");
      const line2 = [levering.postcode, levering.plaats].filter(Boolean).join(" ");
      return [line1, line2].filter(Boolean).join(", ") || "-";
    })();

    const leveringLabel =
      leveringType === "ophalen"
        ? "Ophalen"
        : `Bezorgen - ${checkoutShippingOption.label}`;

    const detailRows = [
      { label: "Factuurnummer", value: checkoutInvoice.invoiceNumber },
      { label: "Aanvoerder", value: checkoutInvoice.aanvoerderNaam },
      { label: "Status", value: "Betaald (demo)" },
      { label: "Datum aankoop", value: fmtDateTime(checkoutInvoice.datum) },
      { label: "Bedrag", value: `EUR ${fmtCurrency(checkoutTotal)}` },
      { label: "Levering", value: leveringLabel },
      { label: "Adres", value: adresRegel },
    ];

    if (levering.opmerkingen) {
      detailRows.push({ label: "Opmerkingen", value: levering.opmerkingen });
    }

    const supplierSuffix =
      checkoutInvoice.aanvoerderNaam && checkoutInvoice.aanvoerderNaam !== "-"
        ? ` bij ${checkoutInvoice.aanvoerderNaam}`
        : "";

    pushMessage(
      "success",
      `Bevestiging: factuur ${checkoutInvoice.invoiceNumber} is betaald (demo)${supplierSuffix}.`,
      detailRows
    );
    setRekeningTab("history");
    closeCheckout();
  };

  return (
    <div className="kop-shell">
      <header className="kop-head">
        <h1>Kopersomgeving</h1>
        <p className="kop-sub">
          {canBuy
            ? "Kies een veiling, volg de klok live en koop jouw producten. Onderin zie je je eigen aankopen."
            : "Kies een veiling en volg de klok live."}
        </p>
        {err && (
          <p className="kop-error" role="alert">
            {err}
          </p>
        )}
      </header>

      {activeTab === "veilingen" && (
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
      )}

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
        {canBookmark && (
          <button
            type="button"
            className={
              "vm-tab" + (activeTab === "opgeslagen" ? " vm-tab--active" : "")
            }
            onClick={() => setActiveTab("opgeslagen")}
          >
            Opgeslagen
          </button>
        )}
        {canBuy && (
          <button
            type="button"
            className={
              "vm-tab" + (activeTab === "aankopen" ? " vm-tab--active" : "")
            }
            onClick={() => setActiveTab("aankopen")}
          >
            Mijn aankopen
          </button>
        )}
        {canBuy && (
          <button
            type="button"
            className={
              "vm-tab" + (activeTab === "rekening" ? " vm-tab--active" : "")
            }
            onClick={() => {
              setActiveTab("rekening");
              setRekeningTab("open");
            }}
          >
            Rekening
          </button>
        )}
      </div>

      {loading ? (
        <p>Gegevens laden...</p>
      ) : isAuctionTab ? (
        <>
          <main className="kop-layout">
            {/* Linker kolom: actieve veilingen + categorie-filter */}
            <section className="kop-left">
              <h2 className="kop-section-title">
                {activeTab === "opgeslagen" ? "Opgeslagen veilingen" : "Veilingen"}
              </h2>

              {activeTab === "veilingen" && categoryOptions.length > 0 && (
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

              {!hasAuctionsInTab ? (
                <p className="kop-extra-text">
                  {activeTab === "opgeslagen"
                    ? "Je hebt nog geen veilingen opgeslagen. Klik op het bookmark-icoon bij een veiling."
                    : searchQuery.trim()
                      ? "Geen veilingen gevonden voor deze zoekterm."
                      : `Er zijn momenteel geen actieve veilingen${
                          categoryFilter !== "ALL"
                            ? " in deze categorie."
                            : "."
                        }`}
                </p>
              ) : (
                <div className="kop-veiling-groups">
                  <div className="kop-veiling-group">
                    <h3 className="kop-group-title">Live veilingen</h3>
                    {liveAuctions.length === 0 ? (
                      <p className="kop-extra-text">Geen live veilingen.</p>
                    ) : (
                      <div className="kop-veiling-list">
                        {liveAuctions.map(renderVeilingCard)}
                      </div>
                    )}
                  </div>

                  <div className="kop-veiling-group">
                    <h3 className="kop-group-title">Niet live</h3>
                    {notLiveAuctions.length === 0 ? (
                      <p className="kop-extra-text">Geen niet-live veilingen.</p>
                    ) : (
                      <div className="kop-veiling-list">
                        {notLiveAuctions.map(renderVeilingCard)}
                      </div>
                    )}
                  </div>
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
                        disabled={!hasAuctionsInTab}
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
                            disabled={!hasAuctionsInTab}
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

                    {canBuy ? (
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
                          disabled={
                            !isVeilingLive || isSoldOut || currentPrice == null
                          }
                        >
                          Koop tegen huidige prijs
                        </button>

                        {koopMsg && (
                          <p className="kop-bid-msg" aria-live="polite">
                            {koopMsg}
                          </p>
                        )}
                      </form>
                    ) : (
                      <div className="kop-koop-form" aria-label="Alleen bekijken">
                        <p className="kop-extra-text">
                          Alleen bekijken: als veilingmeester kun je de veiling
                          volgen, maar niet kopen.
                        </p>
                        {currentPrice != null && (
                          <p className="kop-extra-text">
                            Huidige prijs per stuk: EUR{" "}
                            {fmtCurrency(currentPrice)}
                          </p>
                        )}
                        {koopMsg && (
                          <p className="kop-bid-msg" aria-live="polite">
                            {koopMsg}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </main>
         </>
      ) : activeTab === "aankopen" ? (
        // TAB: Mijn aankopen
        <section
          className="kop-history"
          aria-label="Mijn aankopen"
        >
          <h2 className="kop-history-title">Mijn aankopen</h2>

          <div className="kop-filter" aria-label="Sorteren">
            <label htmlFor="purchaseSort" className="kop-filter-label">
              Sorteren op
            </label>
            <select
              id="purchaseSort"
              className="kop-filter-select"
              value={purchaseSort}
              onChange={(e) => setPurchaseSort(e.target.value)}
            >
              <option value="date_desc">Datum (nieuwste eerst)</option>
              <option value="date_asc">Datum (oudste eerst)</option>
              <option value="cat_az">Categorie (A-Z)</option>
              <option value="cat_za">Categorie (Z-A)</option>
            </select>
          </div>

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
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPurchases.map((t) => {
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
                    const isPaid = paidPurchaseIds.has(String(toewijzingId));
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
                        <td>
                          <span
                            className={
                              "kop-status-pill " +
                              (isPaid
                                ? "kop-status-pill--paid"
                                : "kop-status-pill--open")
                            }
                          >
                            {isPaid ? "Betaald" : "Openstaand"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        // TAB: Rekening (demo)
        <section className="kop-rekening" aria-label="Rekening">
          <header className="kop-rekening-head">
            <h2 className="kop-history-title">Rekening</h2>
            <p className="kop-extra-text kop-extra-text--small">
              Demo: er is geen echte betaalmethode. Na bevestigen markeren we de
              factuur als betaald en sturen we een melding met details.
            </p>
          </header>

          <div className="vm-tabs kop-tabs kop-tabs--sub">
            <button
              type="button"
              className={"vm-tab" + (rekeningTab === "open" ? " vm-tab--active" : "")}
              onClick={() => setRekeningTab("open")}
              aria-pressed={rekeningTab === "open"}
            >
              Te betalen ({openInvoices.length})
            </button>
            <button
              type="button"
              className={"vm-tab" + (rekeningTab === "history" ? " vm-tab--active" : "")}
              onClick={() => setRekeningTab("history")}
              aria-pressed={rekeningTab === "history"}
            >
              Geschiedenis ({paidInvoices.length})
            </button>
          </div>

          {loadingPurchases ? (
            <p>Gegevens laden...</p>
          ) : !koperId ? (
            <p className="kop-extra-text">
              Je bent niet als koper ingelogd, dus er zijn geen facturen om te
              tonen.
            </p>
          ) : invoices.length === 0 ? (
            <p className="kop-extra-text">
              Je hebt nog geen facturen. Doe eerst een aankoop.
            </p>
          ) : rekeningTab === "open" ? (
            openInvoices.length === 0 ? (
              <p className="kop-extra-text">Geen openstaande facturen.</p>
            ) : (
              <div className="kop-rekening-cards">
                {openInvoices.map((inv) => {
                  const buyerPct = Math.round(REKENING_BUYER_PREMIUM_RATE * 100);
                  const vatPct = Math.round(REKENING_VAT_RATE * 100);
                  return (
                    <article key={inv.id} className="kop-rekening-card">
                      <div className="kop-rekening-card__head">
                        <div>
                          <h3 className="kop-rekening-card__title">
                            {inv.invoiceNumber}
                          </h3>
                          <div className="kop-rekening-card__meta">
                            Aankoop: {fmtDateTime(inv.datum)}
                          </div>
                        </div>
                        <span className="kop-status-pill kop-status-pill--open">
                          Openstaand
                        </span>
                      </div>

                      <div className="kop-rekening-card__body">
                        <div className="kop-rekening-card__desc">
                          <strong>{inv.categorie}</strong> - {inv.beschrijving}
                        </div>
                        <div className="kop-rekening-card__seller">
                          Aanvoerder: <strong>{inv.aanvoerderNaam}</strong>
                        </div>

                        <dl className="kop-rekening-breakdown">
                          <div className="kop-rekening-breakdown__row">
                            <dt>Prijs per stuk</dt>
                            <dd>EUR {fmtCurrency(inv.eindPrijs)}</dd>
                          </div>
                          <div className="kop-rekening-breakdown__row">
                            <dt>Aantal</dt>
                            <dd>{inv.aantal}</dd>
                          </div>
                          <div className="kop-rekening-breakdown__row">
                            <dt>Subtotaal</dt>
                            <dd>EUR {fmtCurrency(inv.amounts.subtotal)}</dd>
                          </div>
                          <div className="kop-rekening-breakdown__row">
                            <dt>Veilingkosten ({buyerPct}%)</dt>
                            <dd>EUR {fmtCurrency(inv.amounts.buyerPremium)}</dd>
                          </div>
                          <div className="kop-rekening-breakdown__row">
                            <dt>Verzendkosten</dt>
                            <dd>
                              {inv.amounts.shippingCost == null
                                ? "Nog te bepalen"
                                : `EUR ${fmtCurrency(inv.amounts.shippingCost)}`}
                            </dd>
                          </div>
                          <div className="kop-rekening-breakdown__row">
                            <dt>BTW ({vatPct}%)</dt>
                            <dd>EUR {fmtCurrency(inv.amounts.vat)}</dd>
                          </div>
                          <div className="kop-rekening-breakdown__row kop-rekening-breakdown__row--total">
                            <dt>Totaal</dt>
                            <dd>EUR {fmtCurrency(inv.amounts.total)}</dd>
                          </div>
                        </dl>

                        {inv.amounts.shippingCost == null && (
                          <p className="kop-extra-text kop-extra-text--small">
                            Verzendkosten worden bepaald in de volgende stap
                            (bezorgen/ophalen).
                          </p>
                        )}
                      </div>

                      <div className="kop-rekening-card__actions">
                        <button
                          type="button"
                          className="kop-koop-btn"
                          onClick={() => setCheckoutInvoiceId(String(inv.id))}
                        >
                          Betaal
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )
          ) : paidInvoices.length === 0 ? (
            <p className="kop-extra-text">Nog geen betaalde facturen.</p>
          ) : (
            <div className="kop-rekening-cards">
              {paidInvoices.map((inv) => {
                const buyerPct = Math.round(REKENING_BUYER_PREMIUM_RATE * 100);
                const vatPct = Math.round(REKENING_VAT_RATE * 100);
                const leveringType = inv.levering?.type ?? "ophalen";
                const adresRegel =
                  leveringType === "ophalen"
                    ? "Ophalen bij veilinghuis (demo)"
                    : [
                        [inv.levering?.straat, inv.levering?.huisnummer, inv.levering?.toevoeging]
                          .filter(Boolean)
                          .join(" "),
                        [inv.levering?.postcode, inv.levering?.plaats]
                          .filter(Boolean)
                          .join(" "),
                      ]
                        .filter(Boolean)
                        .join(", ") || "-";
                const verzendLabel =
                  leveringType === "ophalen"
                    ? "Ophalen"
                    : `Bezorgen - ${
                        REKENING_SHIPPING_OPTIONS.find(
                          (opt) => opt.id === inv.levering?.verzendmethode
                        )?.label ?? inv.levering?.verzendmethode ?? "-"
                      }`;

                return (
                  <article key={inv.id} className="kop-rekening-card">
                    <div className="kop-rekening-card__head">
                      <div>
                        <h3 className="kop-rekening-card__title">
                          {inv.invoiceNumber}
                        </h3>
                        <div className="kop-rekening-card__meta">
                          Betaald: {fmtDateTime(inv.betaaldOp)}
                        </div>
                      </div>
                      <span className="kop-status-pill kop-status-pill--paid">
                        Betaald
                      </span>
                    </div>

                    <div className="kop-rekening-card__body">
                      <div className="kop-rekening-card__desc">
                        <strong>{inv.categorie}</strong> - {inv.beschrijving}
                      </div>
                      <div className="kop-rekening-card__seller">
                        Aanvoerder: <strong>{inv.aanvoerderNaam}</strong>
                      </div>

                      <dl className="kop-rekening-breakdown kop-rekening-breakdown--two-col">
                        <div className="kop-rekening-breakdown__row">
                          <dt>Levering</dt>
                          <dd>{verzendLabel}</dd>
                        </div>
                        <div className="kop-rekening-breakdown__row">
                          <dt>Adres</dt>
                          <dd>{adresRegel}</dd>
                        </div>
                        <div className="kop-rekening-breakdown__row">
                          <dt>Subtotaal</dt>
                          <dd>EUR {fmtCurrency(inv.amounts.subtotal)}</dd>
                        </div>
                        <div className="kop-rekening-breakdown__row">
                          <dt>Veilingkosten ({buyerPct}%)</dt>
                          <dd>EUR {fmtCurrency(inv.amounts.buyerPremium)}</dd>
                        </div>
                        <div className="kop-rekening-breakdown__row">
                          <dt>Verzendkosten</dt>
                          <dd>EUR {fmtCurrency(inv.amounts.shippingCost ?? 0)}</dd>
                        </div>
                        <div className="kop-rekening-breakdown__row">
                          <dt>BTW ({vatPct}%)</dt>
                          <dd>EUR {fmtCurrency(inv.amounts.vat)}</dd>
                        </div>
                        <div className="kop-rekening-breakdown__row kop-rekening-breakdown__row--total">
                          <dt>Totaal</dt>
                          <dd>EUR {fmtCurrency(inv.amounts.total)}</dd>
                        </div>
                      </dl>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Popup: Levering (Rekening demo) */}
      {checkoutInvoiceId && (
        <div
          className="kop-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeCheckout();
          }}
          role="presentation"
        >
          <div
            className="kop-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="kop-checkout-title"
            aria-describedby="kop-checkout-desc"
          >
            <div className="kop-modal-header">
              <div>
                <h3 id="kop-checkout-title">Levering</h3>
                <p id="kop-checkout-desc" className="kop-modal-sub">
                  Vul je gegevens in om de factuur te bevestigen (demo).
                </p>
              </div>
              <button
                type="button"
                className="kop-koop-btn kop-koop-btn--ghost"
                onClick={closeCheckout}
              >
                Sluiten
              </button>
            </div>
            <div className="kop-modal-body">
              {!checkoutInvoice ? (
                <p className="kop-extra-text">Factuur niet gevonden.</p>
              ) : (
                <>
                  <div className="kop-modal-section">
                    <div className="kop-modal-meta">
                      <div>
                        <span>Factuur</span>
                        <strong>{checkoutInvoice.invoiceNumber}</strong>
                      </div>
                      <div>
                        <span>Aanvoerder</span>
                        <strong>{checkoutInvoice.aanvoerderNaam}</strong>
                      </div>
                      <div>
                        <span>Artikel</span>
                        <strong>{checkoutInvoice.categorie}</strong>
                      </div>
                      <div>
                        <span>Bedrag (incl. BTW)</span>
                        <strong>EUR {fmtCurrency(checkoutTotal)}</strong>
                      </div>
                    </div>
                    <p className="kop-extra-text kop-extra-text--small">
                      Let op: dit is een demo. Er wordt geen echte betaling
                      uitgevoerd.
                    </p>
                  </div>

                  <form className="kop-rek-form" onSubmit={handleCheckoutConfirm}>
                    <fieldset className="kop-rek-fieldset">
                      <legend className="kop-rek-legend">Leveringskeuze</legend>
                      <label className="kop-rek-radio">
                        <input
                          type="radio"
                          name="levering"
                          value="bezorgen"
                          checked={checkoutForm.levering === "bezorgen"}
                          onChange={(e) =>
                            setCheckoutForm((prev) => ({
                              ...prev,
                              levering: e.target.value,
                            }))
                          }
                        />
                        Bezorgen
                      </label>
                      <label className="kop-rek-radio">
                        <input
                          type="radio"
                          name="levering"
                          value="ophalen"
                          checked={checkoutForm.levering === "ophalen"}
                          onChange={(e) =>
                            setCheckoutForm((prev) => ({
                              ...prev,
                              levering: e.target.value,
                            }))
                          }
                        />
                        Ophalen
                      </label>
                    </fieldset>

                    {checkoutForm.levering === "bezorgen" ? (
                      <>
                        {checkoutPrefillMsg && (
                          <p className="kop-rek-note" aria-live="polite">
                            {checkoutPrefillMsg}
                          </p>
                        )}

                        <div className="kop-rek-grid">
                          <div className="kop-rek-field">
                            <label htmlFor="rek-straat">
                              Straat{" "}
                              <span className="kop-field-required">*</span>
                            </label>
                            <input
                              id="rek-straat"
                              value={checkoutForm.straat}
                              onChange={(e) =>
                                setCheckoutForm((prev) => ({
                                  ...prev,
                                  straat: e.target.value,
                                }))
                              }
                              aria-invalid={Boolean(checkoutFieldErrors.straat)}
                            />
                            {checkoutFieldErrors.straat && (
                              <p className="kop-field-error" role="alert">
                                {checkoutFieldErrors.straat}
                              </p>
                            )}
                          </div>

                          <div className="kop-rek-field">
                            <label htmlFor="rek-huisnummer">
                              Huisnummer{" "}
                              <span className="kop-field-required">*</span>
                            </label>
                            <input
                              id="rek-huisnummer"
                              value={checkoutForm.huisnummer}
                              onChange={(e) =>
                                setCheckoutForm((prev) => ({
                                  ...prev,
                                  huisnummer: e.target.value,
                                }))
                              }
                              aria-invalid={Boolean(
                                checkoutFieldErrors.huisnummer
                              )}
                            />
                            {checkoutFieldErrors.huisnummer && (
                              <p className="kop-field-error" role="alert">
                                {checkoutFieldErrors.huisnummer}
                              </p>
                            )}
                          </div>

                          <div className="kop-rek-field">
                            <label htmlFor="rek-postcode">
                              Postcode{" "}
                              <span className="kop-field-required">*</span>
                            </label>
                            <input
                              id="rek-postcode"
                              value={checkoutForm.postcode}
                              onChange={(e) =>
                                setCheckoutForm((prev) => ({
                                  ...prev,
                                  postcode: e.target.value,
                                }))
                              }
                              aria-invalid={Boolean(
                                checkoutFieldErrors.postcode
                              )}
                            />
                            {checkoutFieldErrors.postcode && (
                              <p className="kop-field-error" role="alert">
                                {checkoutFieldErrors.postcode}
                              </p>
                            )}
                          </div>

                          <div className="kop-rek-field">
                            <label htmlFor="rek-plaats">
                              Plaats{" "}
                              <span className="kop-field-required">*</span>
                            </label>
                            <input
                              id="rek-plaats"
                              value={checkoutForm.plaats}
                              onChange={(e) =>
                                setCheckoutForm((prev) => ({
                                  ...prev,
                                  plaats: e.target.value,
                                }))
                              }
                              aria-invalid={Boolean(checkoutFieldErrors.plaats)}
                            />
                            {checkoutFieldErrors.plaats && (
                              <p className="kop-field-error" role="alert">
                                {checkoutFieldErrors.plaats}
                              </p>
                            )}
                          </div>

                          <div className="kop-rek-field">
                            <label htmlFor="rek-toevoeging">
                              Toevoeging{" "}
                              <span className="kop-field-optional">
                                (optioneel)
                              </span>
                            </label>
                            <input
                              id="rek-toevoeging"
                              value={checkoutForm.toevoeging}
                              onChange={(e) =>
                                setCheckoutForm((prev) => ({
                                  ...prev,
                                  toevoeging: e.target.value,
                                }))
                              }
                            />
                          </div>

                          <div className="kop-rek-field">
                            <label htmlFor="rek-verzend">
                              Verzendmethode{" "}
                              <span className="kop-field-required">*</span>
                            </label>
                            <select
                              id="rek-verzend"
                              value={checkoutForm.verzendmethode}
                              onChange={(e) =>
                                setCheckoutForm((prev) => ({
                                  ...prev,
                                  verzendmethode: e.target.value,
                                }))
                              }
                            >
                              {REKENING_SHIPPING_OPTIONS.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.label} (EUR {fmtCurrency(opt.cost)})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="kop-rek-field kop-rek-field--full">
                            <label htmlFor="rek-opmerkingen">
                              Opmerkingen{" "}
                              <span className="kop-field-optional">
                                (optioneel)
                              </span>
                            </label>
                            <textarea
                              id="rek-opmerkingen"
                              value={checkoutForm.opmerkingen}
                              onChange={(e) =>
                                setCheckoutForm((prev) => ({
                                  ...prev,
                                  opmerkingen: e.target.value,
                                }))
                              }
                              rows={3}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="kop-extra-text kop-extra-text--small">
                        Je kiest voor ophalen. Er zijn geen adresvelden nodig.
                      </p>
                    )}

                    {checkoutErr && (
                      <p className="kop-error" role="alert">
                        {checkoutErr}
                      </p>
                    )}

                    <div className="kop-rek-actions">
                      <button
                        type="button"
                        className="kop-koop-btn kop-koop-btn--ghost"
                        onClick={closeCheckout}
                      >
                        Annuleer
                      </button>
                      <button type="submit" className="kop-koop-btn">
                        Bevestig (demo)
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
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
                        <span>Product</span>
                        <strong>
                          {historyData.productNaam || historyData.categorie || "-"}
                        </strong>
                      </div>
                      <div>
                        <span>Aanvoerder</span>
                        <strong>{historyData.aanvoerderNaam || "-"}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="kop-modal-section">
                    <h4>Laatste 10 prijzen van deze aanvoerder</h4>
                    <PriceHistoryChart
                      title="Grafiek: laatste 10 prijzen van deze aanvoerder"
                      rows={historyData.laatste10Aanvoerder}
                    />
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
                    <PriceHistoryChart
                      title="Grafiek: laatste 10 prijzen van alle aanvoerders"
                      rows={historyData.laatste10Alle}
                    />
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
