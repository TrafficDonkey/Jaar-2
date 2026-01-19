// src/pages/VeilingmeesterPage.jsx
// Veilingmeester-dashboard met tabs:
// - Nieuwe veiling: aanmeldingen → veiling starten
// - Actieve veilingen: alle veilingen met Status = "Actief" + live timer
// - Archief: afgeronde veilingen
// - Overzicht: kleine samenvatting/statistieken

import React, { useEffect, useMemo, useState } from "react";
import "./VeilingmeesterPageStyle.css";
import apiFetch from "../api";
import MessageCenter from "../components/MessageCenter";
import {
  formatDate,
  formatDateTime,
  parseApiDate,
  toTimeMs,
} from "../utils/date";

function formatCurrency(value) {
  const nr = Number(value);
  if (!Number.isFinite(nr)) return "-";
  return nr.toLocaleString("nl-NL", {
    style: "currency",
    currency: "EUR",
  });
}

function getVeilingId(veiling) {
  return veiling?.veilingId ?? veiling?.VeilingId ?? veiling?.id;
}

function getVeilingProductIds(veiling) {
  const producten =
    veiling?.veilingProducten ?? veiling?.VeilingProducten ?? [];
  if (!Array.isArray(producten)) return [];
  return producten
    .map((p) => p?.veilingProductId ?? p?.VeilingProductId ?? p?.id)
    .filter((id) => Number.isFinite(Number(id)))
    .map((id) => Number(id));
}

function buildVeilingDetails({ veiling, aanmelding, startTijd }) {
  const veilingId = veiling?.veilingId ?? veiling?.VeilingId;
  const veilingNaam = veiling?.naam ?? veiling?.Naam ?? "";
  const producten =
    veiling?.veilingProducten ?? veiling?.VeilingProducten ?? [];
  const eersteProduct =
    Array.isArray(producten) && producten.length > 0 ? producten[0] : null;
  const aanmeldingId =
    aanmelding?.aanmeldingId ??
    eersteProduct?.aanmeldingId ??
    eersteProduct?.AanmeldingId;
  const productBeschrijving =
    aanmelding?.productBeschrijving ??
    eersteProduct?.productBeschrijving ??
    eersteProduct?.ProductBeschrijving ??
    "";
  const kloklocatie =
    aanmelding?.gewensteKlokLocatie ??
    aanmelding?.kloklocatie ??
    eersteProduct?.kloklocatie ??
    eersteProduct?.Kloklocatie ??
    "";
  const startLabel = formatDateTime(
    veiling?.startTijd ?? veiling?.StartTijd ?? startTijd
  );

  const details = [
    veilingId ? { label: "Veiling ID", value: `#${veilingId}` } : null,
    veilingNaam ? { label: "Veilingnaam", value: veilingNaam } : null,
    aanmeldingId ? { label: "Aanmelding ID", value: `#${aanmeldingId}` } : null,
    productBeschrijving
      ? { label: "Product", value: productBeschrijving }
      : null,
    kloklocatie ? { label: "Kloklocatie", value: kloklocatie } : null,
    startLabel && startLabel !== "-"
      ? { label: "Starttijd", value: startLabel }
      : null,
  ].filter(Boolean);

  return details;
}

function normalizeToewijzing(raw) {
  const veilingProductId = Number(
    raw?.veilingProductId ?? raw?.VeilingProductId
  );
  const koperId = Number(raw?.koperId ?? raw?.KoperId);
  const aantal = Number(raw?.aantal ?? raw?.Aantal);
  const eindPrijs = Number(raw?.eindPrijs ?? raw?.EindPrijs);

  if (!Number.isFinite(veilingProductId) || veilingProductId <= 0) return null;
  if (!Number.isFinite(koperId) || koperId <= 0) return null;
  if (!Number.isFinite(aantal) || aantal <= 0) return null;
  if (!Number.isFinite(eindPrijs) || eindPrijs < 0) return null;

  return {
    veilingProductId,
    koperId,
    koperNaam: raw?.koperNaam ?? raw?.KoperNaam ?? "",
    aantal,
    eindPrijs,
    productBeschrijving:
      raw?.productBeschrijving ?? raw?.ProductBeschrijving ?? "",
    categorie: raw?.categorie ?? raw?.Categorie ?? "",
  };
}

function buildSummaryFromToewijzingen(toewijzingen) {
  const koperMap = new Map();
  let totaleHoeveelheid = 0;
  let totaleOpbrengst = 0;

  for (const item of toewijzingen) {
    const t = normalizeToewijzing(item);
    if (!t) continue;

    const lineAmount = t.aantal * t.eindPrijs;
    totaleHoeveelheid += t.aantal;
    totaleOpbrengst += lineAmount;

    const existing = koperMap.get(t.koperId) ?? {
      koperId: t.koperId,
      koperNaam: t.koperNaam,
      hoeveelheid: 0,
      totaalBedrag: 0,
      _prijsRegels: new Map(),
    };

    existing.hoeveelheid += t.aantal;
    existing.totaalBedrag += lineAmount;

    const regelKey = `${t.productBeschrijving}@@${t.eindPrijs}`;
    const regel = existing._prijsRegels.get(regelKey) ?? {
      prijsPerStuk: t.eindPrijs,
      hoeveelheid: 0,
      totaalBedrag: 0,
      productBeschrijving: t.productBeschrijving,
    };

    regel.hoeveelheid += t.aantal;
    regel.totaalBedrag += lineAmount;
    existing._prijsRegels.set(regelKey, regel);

    koperMap.set(t.koperId, existing);
  }

  const koperSamenvattingen = [...koperMap.values()]
    .map((k) => ({
      koperId: k.koperId,
      koperNaam: k.koperNaam,
      hoeveelheid: k.hoeveelheid,
      totaalBedrag: k.totaalBedrag,
      prijsRegels: [...k._prijsRegels.values()].sort(
        (a, b) => Number(b.prijsPerStuk) - Number(a.prijsPerStuk)
      ),
    }))
    .sort((a, b) => Number(b.totaalBedrag) - Number(a.totaalBedrag));

  return {
    kopersCount: koperSamenvattingen.length,
    totaleHoeveelheid,
    totaleOpbrengst,
    koperSamenvattingen,
  };
}

function getBackendKopers(veiling) {
  const kopers =
    veiling?.koperSamenvattingen ?? veiling?.KoperSamenvattingen;
  return Array.isArray(kopers) ? kopers : [];
}

function getKopersSearchText(veiling, summary) {
  const kopers =
    summary?.koperSamenvattingen?.length > 0
      ? summary.koperSamenvattingen
      : getBackendKopers(veiling);

  if (!Array.isArray(kopers) || kopers.length === 0) {
    return String(veiling?.winnaarNaam ?? veiling?.koperNaam ?? "");
  }

  return kopers
    .map((k) => {
      const koperId = k.koperId ?? k.KoperId ?? "";
      const koperNaam = k.koperNaam ?? k.KoperNaam ?? "";
      return `#${koperId} ${koperNaam}`.trim();
    })
    .join(" ");
}

function _renderKopersCell(veiling) {
  const kopers =
    veiling?.koperSamenvattingen ?? veiling?.KoperSamenvattingen;
  if (!Array.isArray(kopers) || kopers.length === 0) {
    return veiling?.winnaarNaam ?? veiling?.koperNaam ?? "-";
  }

  const summary = kopers
    .map((k) => `#${k.koperId} (x${k.hoeveelheid ?? 0})`)
    .join(", ");

  return (
    <details className="vm-winners">
      <summary>{summary}</summary>
      <div className="vm-winners-body">
        {kopers.map((k) => {
          const regels = Array.isArray(k.prijsRegels) ? k.prijsRegels : [];
          return (
            <div key={k.koperId} className="vm-winner">
              <div className="vm-winner-head">
                <div className="vm-winner-block">
                  <span className="vm-winner-label">Koper</span>
                  <span className="vm-winner-value">
                    #{k.koperId}
                    {k.koperNaam ? ` - ${k.koperNaam}` : ""}
                  </span>
                </div>
                <div className="vm-winner-block">
                  <span className="vm-winner-label">Gekochte stuks</span>
                  <span className="vm-winner-value">
                    {k.hoeveelheid ?? 0}
                  </span>
                </div>
                <div className="vm-winner-block vm-winner-block--total">
                  <span className="vm-winner-label">Totaal</span>
                  <span className="vm-winner-value">
                    {formatCurrency(k.totaalBedrag ?? 0)}
                  </span>
                </div>
              </div>
              {regels.length > 0 && (
                <div className="vm-winner-lines">
                  {regels.map((r) => (
                    <div
                      key={`${k.koperId}-${r.prijsPerStuk}`}
                      className="vm-winner-line"
                    >
                      <span>
                        Prijs/stuk: {formatCurrency(r.prijsPerStuk ?? 0)}
                      </span>
                      <span>Stuks: {r.hoeveelheid ?? 0}</span>
                      <span>
                        Totaal: {formatCurrency(r.totaalBedrag ?? 0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </details>
  );
}

// Timer-info: vaste duur = 60 seconden vanaf startTijd,
// tenzij backend een expliciete EindTijd teruggeeft.
function getTimerInfo(veiling, nowMs) {
  if (!veiling?.startTijd) {
    return { progress: 0, remainingLabel: "Nog niet gestart" };
  }

  const start = parseApiDate(veiling.startTijd);
  if (!start) {
    return { progress: 0, remainingLabel: "Onbekende starttijd" };
  }

  const startMs = start.getTime();
  const endMs = veiling.eindTijd
    ? toTimeMs(veiling.eindTijd)
    : startMs + 60 * 1000;

  if (!Number.isFinite(endMs) || endMs <= startMs) {
    return { progress: 0, remainingLabel: "Onbekende looptijd" };
  }

  if (nowMs < startMs) {
    const seconds = Math.ceil((startMs - nowMs) / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const countdown = m > 0 ? `${m}m ${s}s` : `${s}s`;
    return { progress: 0, remainingLabel: `Start over ${countdown}` };
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
  const [messages, setMessages] = useState([]);

  const [openAanmeldingen, setOpenAanmeldingen] = useState([]);
  const [actieveVeilingen, setActieveVeilingen] = useState([]); // eigen vorm
  const [archiefVeilingen, setArchiefVeilingen] = useState([]); // VeilingDto's uit backend
  const [archiefToewijzingen, setArchiefToewijzingen] = useState([]);
  const [loadingToewijzingen, setLoadingToewijzingen] = useState(false);

  const [detailVeiling, setDetailVeiling] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Form voor nieuwe veiling
  const [selectedAanmeldingId, setSelectedAanmeldingId] = useState("");
  const [titel, setTitel] = useState("");
  const [startTime, setStartTime] = useState(""); // "HH:MM" (lokaal)

  // Zoeken & sorteren
  const [activeSearch, setActiveSearch] = useState("");
  const [activeSort, setActiveSort] = useState("start-desc"); // start-desc | start-asc | naam

  const [archiveSearch, setArchiveSearch] = useState("");
  const [archiveSort, setArchiveSort] = useState("date-desc"); // date-desc | date-asc | naam | opbrengst

  // "now" voor live timers
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Init: paginatitel + 1-seconde timer voor live countdowns/labels in de UI.
    document.title = "Veilingmeester - FloraFlow";

    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  function pushMessage(type, text, details) {
    // Globale notificaties (Layout) + lokale berichtenlijst op deze pagina.
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
    setMessages((prev) => {
      const next = [
        {
          id: `${Date.now()}-${Math.random()}`,
          type,
          text,
          time,
          ...(cleanDetails ? { details: cleanDetails } : {}),
        },
        ...prev,
      ];
      return next.slice(0, 6);
    });
  }

  useEffect(() => {
    if (!detailOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setDetailOpen(false);
        setDetailVeiling(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailOpen]);

  useEffect(() => {
    // Init-load: open aanmeldingen + actieve veilingen + archief samenvatting.
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab !== "archief") return;
    let cancelled = false;

    const refresh = async () => {
      try {
        const [archiefRes, toewijzingRes] = await Promise.allSettled([
          apiFetch("/Veilingen/archief"),
          apiFetch("/Toewijzingen"),
        ]);

        if (cancelled) return;

        if (archiefRes.status === "fulfilled") {
          setArchiefVeilingen(
            Array.isArray(archiefRes.value) ? archiefRes.value : []
          );
        }

        if (toewijzingRes.status === "fulfilled") {
          setArchiefToewijzingen(
            Array.isArray(toewijzingRes.value) ? toewijzingRes.value : []
          );
        }
      } catch {
        // stil falen; we proberen het later opnieuw
      }
    };

    refresh();
    const id = setInterval(refresh, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [activeTab]);

  async function loadAll() {
    setLoading(true);
    setError("");
    setMsg("");
    try {
      await Promise.all([
        loadOpenAanmeldingen(),
        loadActieveVeilingen(),
        loadArchief(),
        loadToewijzingen(),
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
      const message =
        (err?.message ?? "Fout bij ophalen van open aanmeldingen.") +
        " (Aanmeldingen/open)";
      setError(message);
      pushMessage("error", message);
    }
  }

  async function loadActieveVeilingen() {
    setLoadingActive(true);
    try {
      // Haal ALLE veilingen op
      const alle = await apiFetch("/Veilingen");

      const lijst = Array.isArray(alle) ? alle : [];

      // Filter status "Actief"
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

  async function loadToewijzingen() {
    setLoadingToewijzingen(true);
    try {
      const res = await apiFetch("/Toewijzingen");
      setArchiefToewijzingen(Array.isArray(res) ? res : []);
    } catch (err) {
      setArchiefToewijzingen([]);

      const message = err?.message ?? "";
      if (message && !message.includes("404")) {
        setError(message);
      }
    } finally {
      setLoadingToewijzingen(false);
    }
  }

  const archiefSummaryByVeilingId = useMemo(() => {
    const byProductId = new Map();
    const toewijzingen = Array.isArray(archiefToewijzingen)
      ? archiefToewijzingen
      : [];

    for (const raw of toewijzingen) {
      const t = normalizeToewijzing(raw);
      if (!t) continue;
      const existing = byProductId.get(t.veilingProductId) ?? [];
      existing.push(t);
      byProductId.set(t.veilingProductId, existing);
    }

    const map = new Map();
    for (const veiling of archiefVeilingen) {
      const veilingId = Number(getVeilingId(veiling));
      if (!Number.isFinite(veilingId)) continue;

      const productIds = getVeilingProductIds(veiling);
      const sales = [];
      for (const pid of productIds) {
        const items = byProductId.get(pid);
        if (items?.length) sales.push(...items);
      }

      const backendKopers = getBackendKopers(veiling);
      const backendSummary = {
        kopersCount: backendKopers.length,
        totaleHoeveelheid:
          veiling?.totaleHoeveelheid ??
          veiling?.TotaleHoeveelheid ??
          veiling?.hoeveelheid,
        totaleOpbrengst:
          veiling?.totaleOpbrengst ??
          veiling?.TotaleOpbrengst ??
          veiling?.eindPrijs ??
          veiling?.eindBedrag,
        koperSamenvattingen: backendKopers,
      };

      const computedSummary =
        sales.length > 0 ? buildSummaryFromToewijzingen(sales) : null;

      map.set(veilingId, computedSummary ?? backendSummary);
    }

    return map;
  }, [archiefVeilingen, archiefToewijzingen]);

  // Kleine samenvatting voor tab "Overzicht"
  const stats = useMemo(() => {
    const totaalActief = actieveVeilingen.length;
    const totaalArchief = archiefVeilingen.length;

    const totaalOpbrengst = archiefVeilingen.reduce((sum, v) => {
      const summary = archiefSummaryByVeilingId.get(
        Number(getVeilingId(v))
      );
      const nr = Number(
        summary?.totaleOpbrengst ??
          v.totaleOpbrengst ??
          v.eindPrijs ??
          v.eindBedrag
      );
      return sum + (Number.isNaN(nr) ? 0 : nr);
    }, 0);

    return { totaalActief, totaalArchief, totaalOpbrengst };
  }, [actieveVeilingen, archiefVeilingen, archiefSummaryByVeilingId]);

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
            toTimeMs(a.startTijd) - toTimeMs(b.startTijd)
        );
        break;
      case "naam":
        list.sort((a, b) => (a.naam ?? "").localeCompare(b.naam ?? ""));
        break;
      case "start-desc":
      default:
        list.sort(
          (a, b) =>
            toTimeMs(b.startTijd) - toTimeMs(a.startTijd)
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
        const summary = archiefSummaryByVeilingId.get(
          Number(getVeilingId(v))
        );
        const kopers = getKopersSearchText(v, summary).toLowerCase();
        return naam.includes(q) || kopers.includes(q);
      });
    }

    list.sort((a, b) => {
      const dateA = toTimeMs(a.eindTijd ?? a.datum ?? 0);
      const dateB = toTimeMs(b.eindTijd ?? b.datum ?? 0);
      const summaryA = archiefSummaryByVeilingId.get(
        Number(getVeilingId(a))
      );
      const summaryB = archiefSummaryByVeilingId.get(
        Number(getVeilingId(b))
      );
      const amountA = Number(
        summaryA?.totaleOpbrengst ??
          a.totaleOpbrengst ??
          a.eindPrijs ??
          a.eindBedrag ??
          0
      );
      const amountB = Number(
        summaryB?.totaleOpbrengst ??
          b.totaleOpbrengst ??
          b.eindPrijs ??
          b.eindBedrag ??
          0
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
  }, [archiefVeilingen, archiveSearch, archiveSort, archiefSummaryByVeilingId]);

  const detailSummary = useMemo(() => {
    if (!detailVeiling) return null;

    const productIds = getVeilingProductIds(detailVeiling);
    if (productIds.length === 0) {
      return (
        archiefSummaryByVeilingId.get(Number(getVeilingId(detailVeiling))) ??
        null
      );
    }

    const toewijzingen = Array.isArray(archiefToewijzingen)
      ? archiefToewijzingen
      : [];

    const sales = [];
    for (const raw of toewijzingen) {
      const t = normalizeToewijzing(raw);
      if (!t) continue;
      if (productIds.includes(t.veilingProductId)) sales.push(t);
    }

    return sales.length > 0 ? buildSummaryFromToewijzingen(sales) : null;
  }, [detailVeiling, archiefToewijzingen, archiefSummaryByVeilingId]);

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

      if (!chosen) {
        setError("Kon de gekozen aanmelding niet vinden. Probeer opnieuw.");
        return;
      }

      let startTijd = undefined;
      const timeValue = startTime.trim();
      if (timeValue) {
        const [hhRaw, mmRaw] = timeValue.split(":");
        const hh = Number(hhRaw);
        const mm = Number(mmRaw);

        if (!Number.isInteger(hh) || !Number.isInteger(mm)) {
          setError("Ongeldige starttijd. Gebruik bijvoorbeeld 16:00.");
          return;
        }

        const baseDate = chosen?.gewensteVeilDatum
          ? parseApiDate(chosen.gewensteVeilDatum)
          : new Date();

        if (!baseDate) {
          setError("Kon veildatum niet bepalen voor deze aanmelding.");
          return;
        }

        const localStart = new Date(
          baseDate.getFullYear(),
          baseDate.getMonth(),
          baseDate.getDate(),
          hh,
          mm,
          0,
          0
        );

        if (Number.isNaN(localStart.getTime())) {
          setError("Ongeldige starttijd.");
          return;
        }

        if (localStart.getTime() < Date.now()) {
          setError(
            `Starttijd ligt in het verleden (${formatDateTime(
              localStart.toISOString()
            )}).`
          );
          return;
        }

        startTijd = localStart.toISOString();
      }

      const payload = {
        // PAS AAN ALS JOUW StartVeilingDto ANDERE VELDEN HEEFT
        naam:
          trimmedTitel ||
          chosen?.productBeschrijving ||
          `Veiling #${selectedAanmeldingId}`,
        startTijd,
        aanmeldingId: Number(selectedAanmeldingId),
      };

      const created = await apiFetch("/Veilingen/start", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const details = buildVeilingDetails({
        veiling: created,
        aanmelding: chosen,
        startTijd,
      });

      if (startTijd) {
        setMsg(`Veiling ingepland voor ${formatDateTime(startTijd)}.`);
        pushMessage(
          "success",
          `Veiling ingepland voor ${formatDateTime(startTijd)}.`,
          details
        );
        setSelectedAanmeldingId("");
        setTitel("");
        setStartTime("");

        await Promise.all([loadOpenAanmeldingen(), loadActieveVeilingen()]);
        return;
      }

      setMsg("✅ Veiling gestart.");
      pushMessage("success", "Veiling gestart.", details);
      setSelectedAanmeldingId("");
      setTitel("");
      setStartTime("");

      await Promise.all([loadOpenAanmeldingen(), loadActieveVeilingen()]);
    } catch (err) {
      const message = err?.message ?? "Kon veiling niet starten.";
      setError(message);
      pushMessage("error", message);
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
      pushMessage("success", `Veiling #${veilingId} is gestopt.`);
      await Promise.all([loadActieveVeilingen(), loadArchief()]);
    } catch (err) {
      const message = err?.message ?? "Kon veiling niet stoppen.";
      setError(message);
      pushMessage("error", message);
    }
  }

  function closeDetail() {
    setDetailOpen(false);
    setDetailVeiling(null);
  }

  async function openDetail(veiling) {
    setDetailVeiling(veiling);
    setDetailOpen(true);

    const id = Number(getVeilingId(veiling));
    if (!Number.isFinite(id) || getVeilingProductIds(veiling).length > 0) {
      return;
    }

    try {
      const full = await apiFetch(`/Veilingen/${id}`);
      setDetailVeiling(full ?? veiling);
    } catch {
      // stil falen; we tonen de info die we al hebben
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

          <MessageCenter
            title="Berichten"
            messages={messages}
            onClear={() => setMessages([])}
          />

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
                      <p className="form-hint" role="note">
                        <span className="field-required" aria-hidden="true">*</span>{" "}
                        verplicht ·{" "}
                        <span className="field-optional">(optioneel)</span> optioneel
                      </p>
                      <div className="field">
                        <label htmlFor="titel">
                          Titel <span className="field-optional">(optioneel)</span>
                        </label>
                        <input
                          id="titel"
                          value={titel}
                          onChange={(e) => setTitel(e.target.value)}
                          placeholder="Bijv. Ochtendveiling kamerplanten"
                        />
                      </div>

                      <div className="field">
                        <label htmlFor="starttijd">
                          Starttijd <span className="field-optional">(optioneel)</span>
                        </label>
                        <input
                          id="starttijd"
                          type="time"
                          step="60"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          placeholder="16:00"
                        />
                        <p className="vm-muted">
                          Als je een starttijd invult, is de veiling zichtbaar
                          voor kopers maar niet live tot dat moment.
                        </p>
                      </div>

                      <div className="field">
                        <label htmlFor="aanmelding">
                          Te veilen product{" "}
                          <span className="field-required" aria-hidden="true">*</span>
                        </label>
                        <select
                          id="aanmelding"
                          value={selectedAanmeldingId}
                          onChange={(e) =>
                            setSelectedAanmeldingId(e.target.value)
                          }
                          required
                        >
                          <option value="">- Kies een aanmelding -</option>
                          {openAanmeldingen.map((a) => (
                            <option
                              key={a.aanmeldingId}
                              value={a.aanmeldingId}
                            >
                              #{a.aanmeldingId} · {a.productBeschrijving} · min
                              {formatCurrency(a.minimumPrijs)}
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
                </div>

                <section className="vm-block vm-block--stacked">
                  <details className="vm-disclosure">
                    <summary>
                      <span className="vm-disclosure-main">
                        <span className="vm-disclosure-title">
                          Openstaande aanmeldingen
                        </span>
                        <span className="vm-disclosure-count">
                          ({openAanmeldingen.length})
                        </span>
                      </span>
                      <span className="vm-disclosure-hint">
                        Klik om te openen
                      </span>
                    </summary>
                    <div className="vm-disclosure-body">
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
                                  <td>{formatCurrency(a.minimumPrijs)}</td>
                                  <td>{formatDate(a.gewensteVeilDatum)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </details>
                </section>
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
                    <div className="vm-filter-row">
                      <input
                        placeholder="Zoek op naam of product…"
                        value={activeSearch}
                        onChange={(e) => setActiveSearch(e.target.value)}
                        className="vm-filter-input"
                      />
                      <select
                        value={activeSort}
                        onChange={(e) => setActiveSort(e.target.value)}
                        className="vm-filter-select"
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
                                  Min. prijs: {formatCurrency(p.minimumPrijs ?? 0)}
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
                                    "--vm-timer-progress": `${Math.min(
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
                {loading || loadingArchive || loadingToewijzingen ? (
                  <p>Gegevens laden…</p>
                ) : gefilterdeArchief.length === 0 ? (
                  <p className="vm-muted">
                    Er zijn nog geen afgeronde veilingen in het archief.
                  </p>
                ) : (
                  <>
                    <div className="vm-filter-row">
                      <input
                        placeholder="Zoek op naam of winnaar…"
                        value={archiveSearch}
                        onChange={(e) => setArchiveSearch(e.target.value)}
                        className="vm-filter-input"
                      />
                      <select
                        value={archiveSort}
                        onChange={(e) => setArchiveSort(e.target.value)}
                        className="vm-filter-select vm-filter-select--wide"
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
                            <th>Kopers</th>
                            <th>Hoeveelheid</th>
                            <th>Eindprijs / opbrengst</th>
                            <th>Afgerond op</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gefilterdeArchief.map((v) => {
                            const id = Number(getVeilingId(v));
                            const summary = archiefSummaryByVeilingId.get(id);

                            const kopersCount =
                              typeof summary?.kopersCount === "number"
                                ? summary.kopersCount
                                : getBackendKopers(v).length;

                            const totaleHoeveelheid =
                              typeof summary?.totaleHoeveelheid === "number"
                                ? summary.totaleHoeveelheid
                                : typeof v.totaleHoeveelheid !== "undefined"
                                  ? v.totaleHoeveelheid
                                  : typeof v.TotaleHoeveelheid !== "undefined"
                                    ? v.TotaleHoeveelheid
                                    : v.hoeveelheid;

                            const totaleOpbrengst =
                              typeof summary?.totaleOpbrengst !== "undefined"
                                ? summary.totaleOpbrengst
                                : v.totaleOpbrengst ??
                                  v.TotaleOpbrengst ??
                                  v.eindPrijs ??
                                  v.eindBedrag ??
                                  0;

                            return (
                              <tr
                                key={id || v.veilingId || v.id}
                                className="vm-archief-row"
                                role="button"
                                tabIndex={0}
                                onClick={() => openDetail(v)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    openDetail(v);
                                  }
                                }}
                              >
                              <td>{id || v.veilingId || v.id}</td>
                              <td>{v.naam ?? "Veiling"}</td>
                              <td>
                                {Number.isFinite(kopersCount)
                                  ? kopersCount
                                  : "-"}
                              </td>
                              <td>
                                {typeof totaleHoeveelheid !== "undefined"
                                  ? totaleHoeveelheid
                                  : "-"}
                              </td>
                              <td>
                                {formatCurrency(totaleOpbrengst)}
                              </td>
                              <td>
                                {formatDateTime(v.eindTijd ?? v.datum)}
                              </td>
                            </tr>
                            );
                          })}
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
                      {formatCurrency(stats.totaalOpbrengst)}
                    </span>
                  </div>
                </div>
                <p className="vm-muted vm-overview-note">
                  Dit tabblad geeft een snel overzicht van het aantal actieve en
                  afgeronde veilingen en de totale opbrengst.
                </p>
              </section>
            )}
          </div>

          {detailOpen && detailVeiling && (
            <div className="vm-modal-backdrop" onMouseDown={closeDetail}>
              <div
                className="vm-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Veilingdetails"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <header className="vm-modal-header">
                  <div>
                    <h2 className="vm-modal-title">
                      Veiling #{getVeilingId(detailVeiling) ?? "-"}{" "}
                      {detailVeiling?.naam ? `– ${detailVeiling.naam}` : ""}
                    </h2>
                    <p className="vm-muted">
                      Afgerond op{" "}
                      {formatDateTime(detailVeiling?.eindTijd ?? detailVeiling?.datum)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={closeDetail}
                  >
                    Sluiten
                  </button>
                </header>

                <div className="vm-modal-body">
                  <div className="vm-header-stats vm-modal-stats">
                    <div className="vm-stat">
                      <span className="vm-stat-label">Kopers</span>
                      <span className="vm-stat-value">
                        {detailSummary?.kopersCount ?? "-"}
                      </span>
                    </div>
                    <div className="vm-stat">
                      <span className="vm-stat-label">Verkocht</span>
                      <span className="vm-stat-value">
                        {typeof detailSummary?.totaleHoeveelheid === "number"
                          ? detailSummary.totaleHoeveelheid
                          : "-"}
                      </span>
                    </div>
                    <div className="vm-stat">
                      <span className="vm-stat-label">Opbrengst</span>
                      <span className="vm-stat-value">
                        {formatCurrency(detailSummary?.totaleOpbrengst ?? 0)}
                      </span>
                    </div>
                  </div>

                  {!detailSummary ||
                  !Array.isArray(detailSummary.koperSamenvattingen) ||
                  detailSummary.koperSamenvattingen.length === 0 ? (
                    <p className="vm-muted">
                      Geen aankoopgegevens gevonden voor deze veiling.
                    </p>
                  ) : (
                    <div className="vm-winners-body">
                      {detailSummary.koperSamenvattingen.map((k) => {
                        const koperId = k.koperId ?? k.KoperId;
                        const koperNaam = k.koperNaam ?? k.KoperNaam ?? "";
                        const hoeveelheid = k.hoeveelheid ?? k.Hoeveelheid ?? 0;
                        const totaalBedrag = k.totaalBedrag ?? k.TotaalBedrag ?? 0;
                        const regels = Array.isArray(k.prijsRegels)
                          ? k.prijsRegels
                          : Array.isArray(k.PrijsRegels)
                            ? k.PrijsRegels
                            : [];

                        return (
                          <div key={koperId} className="vm-winner">
                            <div className="vm-winner-head">
                              <div className="vm-winner-block">
                                <span className="vm-winner-label">Koper</span>
                                <span className="vm-winner-value">
                                  #{koperId}
                                  {koperNaam ? ` - ${koperNaam}` : ""}
                                </span>
                              </div>
                              <div className="vm-winner-block">
                                <span className="vm-winner-label">
                                  Gekochte stuks
                                </span>
                                <span className="vm-winner-value">
                                  {hoeveelheid}
                                </span>
                              </div>
                              <div className="vm-winner-block vm-winner-block--total">
                                <span className="vm-winner-label">Totaal</span>
                                <span className="vm-winner-value">
                                  {formatCurrency(totaalBedrag)}
                                </span>
                              </div>
                            </div>
                            {regels.length > 0 && (
                              <div className="vm-winner-lines">
                                {regels.map((r) => {
                                  const prijsPerStuk = r.prijsPerStuk ?? r.PrijsPerStuk ?? 0;
                                  const regelHoeveelheid = r.hoeveelheid ?? r.Hoeveelheid ?? 0;
                                  const regelTotaal = r.totaalBedrag ?? r.TotaalBedrag ?? 0;
                                  const product = r.productBeschrijving ?? r.ProductBeschrijving ?? "";
                                  const labelProduct = product || "Onbekend product";

                                  return (
                                    <div
                                      key={`${koperId}-${product}-${prijsPerStuk}`}
                                      className="vm-winner-line"
                                    >
                                      <span>
                                        Product: {labelProduct}
                                      </span>
                                      <span>
                                        Prijs/stuk: {formatCurrency(prijsPerStuk)}
                                      </span>
                                      <span>
                                        Stuks: {regelHoeveelheid}
                                      </span>
                                      <span>
                                        Totaal: {formatCurrency(regelTotaal)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
