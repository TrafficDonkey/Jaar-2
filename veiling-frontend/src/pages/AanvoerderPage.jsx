// src/pages/AanvoerderPage.jsx
// Aanvoerder-dashboard:
// - Producten aanmelden voor de veiling
// - Overzicht van eigen aanmeldingen
// - Overzicht van toewijzingen (verkochte kavels) + totale opbrengst

import React, { useEffect, useMemo, useRef, useState } from "react";
import "./AanvoerderPageStyle.css";
import apiFetch from "../api";
import { formatDate, parseApiDate, toTimeMs } from "../utils/date";
import { PLANTEN_CATEGORIEEN } from "../utils/plantenCategorieen";
import { POTMATEN, getPotmaat } from "../utils/potmaten";

// Vastgestelde kloklocaties
const KLOK_LOCATIES = ["Naaldwijk", "Aalsmeer", "Rijnsburg", "Eelde"];
const FOTO_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const FOTO_CONTENT_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
];
const FOTO_FORMAT_LABEL = "jpg, jpeg, png, gif, webp";

// Probeer gebruikerId uit JWT-token te halen
function getGebruikerIdFromToken() {
    const token = sessionStorage.getItem("token");
    if (!token) return null;
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        const payload = JSON.parse(atob(parts[1]));
        const raw =
            payload.nameid ||
            payload[
                "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
                ] ||
            payload[
                "http://schemas.microsoft.com/ws/2008/06/identity/claims/nameidentifier"
                ] ||
            null;
        return raw ? Number(raw) : null;
    } catch {
        return null;
    }
}

// Probeer rol uit sessionStorage / JWT-token te halen
function getRoleFromToken() {
    const stored = sessionStorage.getItem("role");
    if (stored) return stored;

    const token = sessionStorage.getItem("token");
    if (!token) return null;

    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        const payload = JSON.parse(atob(parts[1]));
        return (
            payload.role ||
            payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
            null
        );
    } catch {
        return null;
    }
}

function formatCurrency(value) {
    const nr = Number(value);
    if (Number.isNaN(nr)) return "-";
    return nr.toLocaleString("nl-NL", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

// Bepaal status van een aanmelding op basis van veildatum
function getAanmeldingStatus(iso) {
    if (!iso) return { label: "Onbekend", className: "aanv-status--unknown" };

    const d = parseApiDate(iso);
    if (!d) {
        return { label: "Onbekend", className: "aanv-status--unknown" };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cmp = new Date(d);
    cmp.setHours(0, 0, 0, 0);

    if (cmp.getTime() === today.getTime()) {
        return { label: "Vandaag", className: "aanv-status--today" };
    }
    if (cmp > today) {
        return { label: "Gepland", className: "aanv-status--upcoming" };
    }
    return { label: "Verlopen", className: "aanv-status--past" };
}

export default function AanvoerderPage() {
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");
    const [error, setError] = useState("");

    const [role, setRole] = useState(null);
    const [gebruikerId, setGebruikerId] = useState(null);
    const [gebruikerNaam, setGebruikerNaam] = useState("");

    const [aanmeldingen, setAanmeldingen] = useState([]);
    const [toewijzingen, setToewijzingen] = useState([]);

    const [form, setForm] = useState({
        fotoFile: null,
        productNaam: "",
        productBeschrijving: "",
        hoeveelheid: 1,
        minimumPrijs: 0,
        categorie: PLANTEN_CATEGORIEEN.categories[0] ?? PLANTEN_CATEGORIEEN.overigeLabel,
        kloklocatie: "Naaldwijk",
        veilDatum: "",
        plantDiameterCm: "",
        plantLengteCm: "",
        potMaat: "",
    });

    const fotoInputRef = useRef(null);

    // Eerste init: titel + rol + gebruikerId bepalen
    useEffect(() => {
        document.title = "FloraFlow — Aanvoerder";

        const r = getRoleFromToken();
        setRole(r);

        const storedId = sessionStorage.getItem("gebruikerId");
        if (storedId) {
            setGebruikerId(Number(storedId));
        } else {
            setGebruikerId(getGebruikerIdFromToken());
        }
    }, []);

    // Data laden zodra rol + gebruikerId bekend zijn
    useEffect(() => {
        // Rol bekend maar géén Aanvoerder of Admin? -> geen data laden
        if (role && role !== "Aanvoerder" && role !== "Admin") {
            setLoadingData(false);
            return;
        }
        if (!gebruikerId) {
            // nog aan het bepalen of het lukt niet
            return;
        }

        async function load() {
            setLoadingData(true);
            setError("");
            setMsg("");

            try {
                // 1) Gebruiker-info ophalen (voor "Ingelogd als …")
                const g = await apiFetch(`/Gebruikers/${gebruikerId}`);
                setGebruikerNaam(g?.naam ?? "");

                // 2) Eigen aanmeldingen + toewijzingen
                const [aRes, tRes] = await Promise.all([
                    apiFetch("/Aanmeldingen/mine"),
                    apiFetch("/Toewijzingen/mine"),
                ]);

                setAanmeldingen(Array.isArray(aRes) ? aRes : []);
                setToewijzingen(Array.isArray(tRes) ? tRes : []);
            } catch (err) {
                setError(err?.message ?? "Kon gegevens niet laden.");
            } finally {
                setLoadingData(false);
            }
        }

        load();
    }, [role, gebruikerId]);

    // ───────────────────────── helpers ─────────────────────────

    function updateField(name, value) {
        setForm((prev) => ({ ...prev, [name]: value }));
    }

    const [categorieInput, setCategorieInput] = useState(form.categorie);
    const [showCategorieSuggest, setShowCategorieSuggest] = useState(false);
    const [categorieSuggestIndex, setCategorieSuggestIndex] = useState(-1);
    const categorieSuggestRef = useRef(null);

    const filteredCategorieen = useMemo(() => {
        const q = String(categorieInput ?? "").trim().toLowerCase();
        const list = PLANTEN_CATEGORIEEN.categories ?? [];
        return q ? list.filter((c) => c.toLowerCase().includes(q)) : list;
    }, [categorieInput]);

    useEffect(() => {
        setCategorieInput(form.categorie);
    }, [form.categorie]);

    const beschikbareProductNamen = useMemo(() => {
        const cat = form.categorie;
        return PLANTEN_CATEGORIEEN.plantsByCategory?.[cat] ?? [];
    }, [form.categorie]);
    const [showProductSuggest, setShowProductSuggest] = useState(false);
    const [productSuggestIndex, setProductSuggestIndex] = useState(-1);
    const [productSuggestLimit, setProductSuggestLimit] = useState(60);
    const productSuggestRef = useRef(null);

    const allFilteredProductNamen = useMemo(() => {
        if (form.categorie === PLANTEN_CATEGORIEEN.overigeLabel) return [];
        const q = String(form.productNaam ?? "").trim().toLowerCase();
        const list = beschikbareProductNamen;
        return q
            ? list.filter((n) => n.toLowerCase().includes(q))
            : list;
    }, [beschikbareProductNamen, form.categorie, form.productNaam]);

    const visibleProductNamen = useMemo(() => {
        return allFilteredProductNamen.slice(0, productSuggestLimit);
    }, [allFilteredProductNamen, productSuggestLimit]);

    useEffect(() => {
        setProductSuggestLimit(60);
        setProductSuggestIndex(-1);
    }, [form.categorie, form.productNaam]);

    useEffect(() => {
        function onDocMouseDown(e) {
            if (!productSuggestRef.current) return;
            if (!productSuggestRef.current.contains(e.target)) {
                setShowProductSuggest(false);
                setProductSuggestIndex(-1);
            }
        }
        document.addEventListener("mousedown", onDocMouseDown);
        return () => document.removeEventListener("mousedown", onDocMouseDown);
    }, []);

    useEffect(() => {
        function onDocMouseDown(e) {
            if (!categorieSuggestRef.current) return;
            if (!categorieSuggestRef.current.contains(e.target)) {
                setShowCategorieSuggest(false);
                setCategorieSuggestIndex(-1);
                setCategorieInput(form.categorie);
            }
        }
        document.addEventListener("mousedown", onDocMouseDown);
        return () => document.removeEventListener("mousedown", onDocMouseDown);
    }, [form.categorie]);

    // Stats voor bovenaan de pagina
    const stats = useMemo(() => {
        const totaalAanmeldingen = aanmeldingen.length;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const geplandeAanmeldingen = aanmeldingen.filter((a) => {
            if (!a.gewensteVeilDatum) return false;
            const d = parseApiDate(a.gewensteVeilDatum);
            if (!d) return false;
            d.setHours(0, 0, 0, 0);
            return d >= today;
        }).length;

        const totaalToewijzingen = toewijzingen.length;
        const totaleOpbrengst = toewijzingen.reduce((sum, t) => {
            const nr = Number(t.eindPrijs);
            return sum + (Number.isNaN(nr) ? 0 : nr);
        }, 0);

        return {
            totaalAanmeldingen,
            geplandeAanmeldingen,
            totaalToewijzingen,
            totaleOpbrengst,
        };
    }, [aanmeldingen, toewijzingen]);

    const sortedAanmeldingen = useMemo(
        () =>
            [...aanmeldingen].sort((a, b) => {
                const da = toTimeMs(a.gewensteVeilDatum ?? 0);
                const db = toTimeMs(b.gewensteVeilDatum ?? 0);
                return da - db;
            }),
        [aanmeldingen]
    );

    const sortedToewijzingen = useMemo(
        () =>
            [...toewijzingen].sort((a, b) => {
                const da = toTimeMs(a.datum ?? 0);
                const db = toTimeMs(b.datum ?? 0);
                return db - da;
            }),
        [toewijzingen]
    );

    // ───────────────────── nieuwe aanmelding opslaan ─────────────────────

    async function handleSubmit(e) {
        e.preventDefault();
        setMsg("");
        setError("");

        if (!gebruikerId) {
            setError(
                "Kon de ingelogde gebruiker niet bepalen. Log opnieuw in en probeer het nog eens."
            );
            return;
        }
        if (!String(form.productNaam ?? "").trim()) {
            setError("Productnaam is verplicht.");
            return;
        }

        if (form.categorie !== PLANTEN_CATEGORIEEN.overigeLabel) {
            const chosen = String(form.productNaam ?? "").trim();
            const ok = beschikbareProductNamen.some(
                (n) => n.toLowerCase() === chosen.toLowerCase()
            );
            if (!ok) {
                setError(
                    `Kies een productnaam uit de lijst, of kies categorie ${PLANTEN_CATEGORIEEN.overigeLabel} voor een vrije invoer.`
                );
                return;
            }
        }
        if (!form.veilDatum) {
            setError("Kies een veildatum.");
            return;
        }

        // Client-side validatie voor hoeveelheid, prijs en datum
        const qty = Number(form.hoeveelheid);
        const minPrice = Number(form.minimumPrijs);
        const plantDiameter =
            String(form.plantDiameterCm ?? "").trim() === ""
                ? null
                : Number(form.plantDiameterCm);
        const plantLengte =
            String(form.plantLengteCm ?? "").trim() === ""
                ? null
                : Number(form.plantLengteCm);

        if (!Number.isFinite(qty) || qty <= 0) {
            setError("Hoeveelheid moet groter zijn dan 0.");
            return;
        }

        if (!Number.isFinite(minPrice) || minPrice < 0) {
            setError("Minimumprijs kan niet negatief zijn.");
            return;
        }

        if (
            plantDiameter !== null &&
            (!Number.isFinite(plantDiameter) || plantDiameter <= 0)
        ) {
            setError("Plant diameter moet groter zijn dan 0.");
            return;
        }
        if (plantLengte !== null && (!Number.isFinite(plantLengte) || plantLengte <= 0)) {
            setError("Plant lengte moet groter zijn dan 0.");
            return;
        }

        const veilDate = new Date(form.veilDatum + "T00:00:00");
        if (Number.isNaN(veilDate.getTime())) {
            setError("De gekozen veildatum is ongeldig.");
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const veilCmp = new Date(veilDate);
        veilCmp.setHours(0, 0, 0, 0);

        if (veilCmp < today) {
            setError("De veildatum kan niet in het verleden liggen.");
            return;
        }

        if (!form.kloklocatie.trim()) {
            setError("Kloklocatie is verplicht.");
            return;
        }

        if (!KLOK_LOCATIES.includes(form.kloklocatie)) {
            setError(
                "Kloklocatie moet één van de volgende zijn: Naaldwijk, Aalsmeer, Rijnsburg of Eelde."
            );
            return;
        }

        const fotoFile = form.fotoFile;
        if (fotoFile) {
            const ext = fotoFile.name
                ? `.${fotoFile.name.split(".").pop().toLowerCase()}`
                : "";
            const isExtAllowed = FOTO_EXTENSIONS.includes(ext);
            const isTypeAllowed =
                !fotoFile.type || FOTO_CONTENT_TYPES.includes(fotoFile.type);

            if (!isExtAllowed || !isTypeAllowed) {
                setError(
                    `Foto moet een van de volgende formaten zijn: ${FOTO_FORMAT_LABEL}.`
                );
                return;
            }
        }

        try {
            setSaving(true);
            setMsg("Aanmelding opslaan…");

            const veilDatumIso = veilDate.toISOString();

            const productNaam = String(form.productNaam ?? "").trim();
            const details = String(form.productBeschrijving ?? "").trim();
            const combinedBeschrijving = details
                ? `${productNaam} - ${details}`
                : productNaam;

            const data = new FormData();
            if (fotoFile) {
                data.append("foto", fotoFile);
            }
            data.append("productBeschrijving", combinedBeschrijving);
            data.append("hoeveelheid", String(qty));
            data.append("minimumPrijs", String(minPrice));
            data.append("categorie", form.categorie);
            data.append("gewensteKlokLocatie", form.kloklocatie.trim());
            data.append("gewensteVeilDatum", veilDatumIso);
            data.append("gebruikerId", String(gebruikerId));
            if (plantDiameter !== null) data.append("plantDiameterCm", String(plantDiameter));
            if (plantLengte !== null) data.append("plantLengteCm", String(plantLengte));
            if (String(form.potMaat ?? "").trim()) data.append("potMaat", String(form.potMaat).trim());

            const created = await apiFetch("/Aanmeldingen", {
                method: "POST",
                body: data,
            });

            // nieuwe aanmelding bovenaan
            setAanmeldingen((prev) => [created, ...prev]);

            // formulier resetten
            setForm({
                fotoFile: null,
                productNaam: "",
                productBeschrijving: "",
                hoeveelheid: 1,
                minimumPrijs: 0,
                categorie: PLANTEN_CATEGORIEEN.categories[0] ?? PLANTEN_CATEGORIEEN.overigeLabel,
                kloklocatie: "Naaldwijk",
                veilDatum: "",
                plantDiameterCm: "",
                plantLengteCm: "",
                potMaat: "",
            });
            if (fotoInputRef.current) {
                fotoInputRef.current.value = "";
            }

            setMsg("✅ Aanmelding opgeslagen.");
        } catch (err) {
            setError(err?.message ?? "Opslaan van de aanmelding is mislukt.");
        } finally {
            setSaving(false);
        }
    }

    function handleResetForm() {
        setForm({
            fotoFile: null,
            productNaam: "",
            productBeschrijving: "",
            hoeveelheid: 1,
            minimumPrijs: 0,
            categorie: PLANTEN_CATEGORIEEN.categories[0] ?? PLANTEN_CATEGORIEEN.overigeLabel,
            kloklocatie: "Naaldwijk",
            veilDatum: "",
            plantDiameterCm: "",
            plantLengteCm: "",
            potMaat: "",
        });
        if (fotoInputRef.current) {
            fotoInputRef.current.value = "";
        }
        setError("");
        setMsg("");
    }

    // ───────────────────── rol-guard (geen aanvoerder) ─────────────────────

    if (!role || (role !== "Aanvoerder" && role !== "Admin")) {
        return (
            <div className="page-shell aanv-shell">
                <main className="aanv-main">
                    <section className="aanv-panel">
                        <h1>Geen toegang</h1>
                        <p className="aanv-sub">
                            Deze pagina is alleen beschikbaar voor aanvoerders.
                        </p>
                    </section>
                </main>
            </div>
        );
    }

    // ────────────────────────── render ──────────────────────────

    return (
        <div className="page-shell aanv-shell">
            <main className="aanv-main" aria-labelledby="aanv-title">
                {/* Hoofdkaart: formulier + stats */}
                <section className="aanv-panel">
                    <header className="aanv-header">
                        <div className="aanv-header-main">
                            <h1 id="aanv-title">Product aanmelden</h1>
                            <p className="aanv-sub">
                                Meld hier je kavels aan voor de veiling. Vul minimaal
                                beschrijving, hoeveelheid, minimumprijs en veildatum in.
                            </p>
                            {gebruikerNaam && (
                                <p className="aanv-meta">
                                    Ingelogd als <strong>{gebruikerNaam}</strong>
                                </p>
                            )}
                        </div>
                        <div className="aanv-header-aside">
                            <p className="aanv-meta">
                                Vandaag gepland:{" "}
                                <strong>{stats.geplandeAanmeldingen}</strong> kavels
                            </p>
                        </div>
                    </header>

                    {/* Kleine stats rij */}
                    <div className="aanv-stat-row" aria-label="Overzicht van jouw kavels">
                        <div className="aanv-stat-card">
                            <p className="aanv-stat-label">Totaal aangemeld</p>
                            <p className="aanv-stat-value">{stats.totaalAanmeldingen}</p>
                        </div>
                        <div className="aanv-stat-card">
                            <p className="aanv-stat-label">
                                Kavels met toekomstige veildatum
                            </p>
                            <p className="aanv-stat-value">
                                {stats.geplandeAanmeldingen}
                            </p>
                        </div>
                        <div className="aanv-stat-card">
                            <p className="aanv-stat-label">Totaal toegewezen kavels</p>
                            <p className="aanv-stat-value">{stats.totaalToewijzingen}</p>
                        </div>
                        <div className="aanv-stat-card">
                            <p className="aanv-stat-label">
                                Totale opbrengst (incl. toewijzingen)
                            </p>
                            <p className="aanv-stat-value">
                                € {formatCurrency(stats.totaleOpbrengst)}
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="aanv-alert" role="alert">
                            ❌ {error}
                        </div>
                    )}
                    {msg && !error && (
                        <p className="aanv-msg" aria-live="polite">
                            {msg}
                        </p>
                    )}

                    <form className="aanv-form" onSubmit={handleSubmit} noValidate>
                        <div className="field">
                            <label htmlFor="foto">
                                Foto (optioneel: {FOTO_FORMAT_LABEL})
                            </label>
                            <input
                                id="foto"
                                type="file"
                                accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                ref={fotoInputRef}
                                onChange={(e) =>
                                    updateField(
                                        "fotoFile",
                                        e.target.files ? e.target.files[0] : null
                                    )
                                }
                            />
                        </div>

                        <div className="field">
                            <label htmlFor="beschrijving">Beschrijving (optioneel)</label>
                            <input
                                id="beschrijving"
                                type="text"
                                value={form.productBeschrijving}
                                onChange={(e) =>
                                    updateField("productBeschrijving", e.target.value)
                                }
                                placeholder="Bijv. orchidee wit, 2 takken, volle knop"
                            />
                            <p className="aanv-help">
                                Bijvoorbeeld: "Orchidee wit, 2 takken, volle knop".
                            </p>
                        </div>

                        <div className="field-row">
                            <div className="field">
                                <label htmlFor="categorie">Categorie</label>
                                <div
                                    className="aanv-autocomplete"
                                    ref={categorieSuggestRef}
                                >
                                    <input
                                        id="categorie"
                                        value={categorieInput}
                                        onChange={(e) => {
                                            setCategorieInput(e.target.value);
                                            setShowCategorieSuggest(true);
                                            setCategorieSuggestIndex(-1);
                                        }}
                                        onFocus={() => setShowCategorieSuggest(true)}
                                        onBlur={() => {
                                            window.setTimeout(() => {
                                                setShowCategorieSuggest(false);
                                                setCategorieSuggestIndex(-1);
                                                setCategorieInput(form.categorie);
                                            }, 120);
                                        }}
                                        onKeyDown={(e) => {
                                            if (!showCategorieSuggest) return;
                                            const maxIdx = filteredCategorieen.length - 1;

                                            if (e.key === "ArrowDown") {
                                                e.preventDefault();
                                                setCategorieSuggestIndex((i) =>
                                                    maxIdx >= 0 ? Math.min(i + 1, maxIdx) : -1
                                                );
                                            } else if (e.key === "ArrowUp") {
                                                e.preventDefault();
                                                setCategorieSuggestIndex((i) =>
                                                    maxIdx >= 0 ? Math.max(i - 1, 0) : -1
                                                );
                                            } else if (e.key === "Escape") {
                                                setShowCategorieSuggest(false);
                                                setCategorieSuggestIndex(-1);
                                                setCategorieInput(form.categorie);
                                            } else if (e.key === "Enter") {
                                                const picked =
                                                    categorieSuggestIndex >= 0
                                                        ? filteredCategorieen[categorieSuggestIndex]
                                                        : null;

                                                if (picked) {
                                                    e.preventDefault();
                                                    updateField("categorie", picked);
                                                    updateField("productNaam", "");
                                                    setCategorieInput(picked);
                                                    setShowCategorieSuggest(false);
                                                    setCategorieSuggestIndex(-1);
                                                    setShowProductSuggest(false);
                                                } else {
                                                    const exact = filteredCategorieen.find(
                                                        (c) =>
                                                            c.toLowerCase() ===
                                                            String(categorieInput ?? "").trim().toLowerCase()
                                                    );
                                                    if (exact) {
                                                        e.preventDefault();
                                                        updateField("categorie", exact);
                                                        updateField("productNaam", "");
                                                        setCategorieInput(exact);
                                                        setShowCategorieSuggest(false);
                                                        setCategorieSuggestIndex(-1);
                                                        setShowProductSuggest(false);
                                                    }
                                                }
                                            }
                                        }}
                                        placeholder="Typ om te zoeken..."
                                        autoComplete="off"
                                        required
                                    />
                                    {showCategorieSuggest && filteredCategorieen.length > 0 && (
                                        <div
                                            className="aanv-autocomplete-list"
                                            role="listbox"
                                            aria-label="Categorieen"
                                        >
                                            {filteredCategorieen.map((c, idx) => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    className={
                                                        "aanv-autocomplete-item" +
                                                        (idx === categorieSuggestIndex
                                                            ? " aanv-autocomplete-item--active"
                                                            : "")
                                                    }
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        updateField("categorie", c);
                                                        updateField("productNaam", "");
                                                        setCategorieInput(c);
                                                        setShowCategorieSuggest(false);
                                                        setCategorieSuggestIndex(-1);
                                                        setShowProductSuggest(false);
                                                    }}
                                                    onMouseEnter={() =>
                                                        setCategorieSuggestIndex(idx)
                                                    }
                                                >
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="field">
                            <label htmlFor="productNaam">Productnaam</label>
                            {form.categorie === PLANTEN_CATEGORIEEN.overigeLabel ? (
                                <input
                                    id="productNaam"
                                    type="text"
                                    value={form.productNaam}
                                    onChange={(e) =>
                                        updateField("productNaam", e.target.value)
                                    }
                                    placeholder="Bijv. Roos"
                                    required
                                />
                            ) : (
                                <div
                                    className="aanv-autocomplete"
                                    ref={productSuggestRef}
                                >
                                    <input
                                        id="productNaam"
                                        value={form.productNaam}
                                        onChange={(e) => {
                                            updateField("productNaam", e.target.value);
                                            setShowProductSuggest(true);
                                            setProductSuggestIndex(-1);
                                            setProductSuggestLimit(60);
                                        }}
                                        onFocus={() => setShowProductSuggest(true)}
                                        onKeyDown={(e) => {
                                            if (!showProductSuggest) return;
                                            if (e.key === "Escape") {
                                                setShowProductSuggest(false);
                                                setProductSuggestIndex(-1);
                                                return;
                                            }
                                            if (e.key === "ArrowDown") {
                                                e.preventDefault();
                                                if (
                                                    productSuggestIndex >=
                                                        visibleProductNamen.length - 1 &&
                                                    visibleProductNamen.length <
                                                        allFilteredProductNamen.length
                                                ) {
                                                    setProductSuggestLimit((n) =>
                                                        Math.min(
                                                            n + 60,
                                                            allFilteredProductNamen.length
                                                        )
                                                    );
                                                }
                                                setProductSuggestIndex((i) =>
                                                    Math.min(
                                                        visibleProductNamen.length - 1,
                                                        i + 1
                                                    )
                                                );
                                                return;
                                            }
                                            if (e.key === "ArrowUp") {
                                                e.preventDefault();
                                                setProductSuggestIndex((i) =>
                                                    Math.max(-1, i - 1)
                                                );
                                                return;
                                            }
                                            if (e.key === "Enter" && productSuggestIndex >= 0) {
                                                e.preventDefault();
                                                const chosen =
                                                    visibleProductNamen[productSuggestIndex];
                                                if (chosen) {
                                                    updateField("productNaam", chosen);
                                                    setShowProductSuggest(false);
                                                    setProductSuggestIndex(-1);
                                                }
                                            }
                                        }}
                                        placeholder="Typ om te zoeken..."
                                        autoComplete="off"
                                        required
                                    />
                                    {showProductSuggest && visibleProductNamen.length > 0 && (
                                        <div
                                            className="aanv-autocomplete-list"
                                            role="listbox"
                                            aria-label="Productnamen"
                                            onScroll={(e) => {
                                                const el = e.currentTarget;
                                                const nearBottom =
                                                    el.scrollTop + el.clientHeight >=
                                                    el.scrollHeight - 40;
                                                if (
                                                    nearBottom &&
                                                    visibleProductNamen.length <
                                                        allFilteredProductNamen.length
                                                ) {
                                                    setProductSuggestLimit((n) =>
                                                        Math.min(
                                                            n + 60,
                                                            allFilteredProductNamen.length
                                                        )
                                                    );
                                                }
                                            }}
                                        >
                                            {visibleProductNamen.map((naam, idx) => (
                                                <button
                                                    key={naam}
                                                    type="button"
                                                    className={
                                                        "aanv-autocomplete-item" +
                                                        (idx === productSuggestIndex
                                                            ? " aanv-autocomplete-item--active"
                                                            : "")
                                                    }
                                                    onMouseEnter={() =>
                                                        setProductSuggestIndex(idx)
                                                    }
                                                    onClick={() => {
                                                        updateField("productNaam", naam);
                                                        setShowProductSuggest(false);
                                                        setProductSuggestIndex(-1);
                                                    }}
                                                >
                                                    {naam}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            <p className="aanv-help">
                                Zoek door te typen. Staat jouw product er niet bij? Kies dan
                                categorie{" "}
                                <strong>{PLANTEN_CATEGORIEEN.overigeLabel}</strong>.
                            </p>
                        </div>

                        <div className="field-row">
                            <div className="field">
                                <label htmlFor="hoeveelheid">Hoeveelheid (stuks)</label>
                                <input
                                    id="hoeveelheid"
                                    type="number"
                                    min={1}
                                    value={form.hoeveelheid}
                                    onChange={(e) => updateField("hoeveelheid", e.target.value)}
                                    required
                                />
                            </div>

                            <div className="field">
                                <label htmlFor="minprijs">Minimumprijs (€)</label>
                                <input
                                    id="minprijs"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={form.minimumPrijs}
                                    onChange={(e) =>
                                        updateField("minimumPrijs", e.target.value)
                                    }
                                    required
                                />
                            </div>
                        </div>

                        <div className="field-row">
                            <div className="field">
                                <label htmlFor="klok">Kloklocatie</label>
                                <select
                                    id="klok"
                                    value={form.kloklocatie}
                                    onChange={(e) => updateField("kloklocatie", e.target.value)}
                                    required
                                >
                                    {KLOK_LOCATIES.map((loc) => (
                                        <option key={loc} value={loc}>
                                            {loc}
                                        </option>
                                    ))}
                                </select>
                                <p className="aanv-help">
                                    Kies één van de vaste locaties: Naaldwijk, Aalsmeer,
                                    Rijnsburg of Eelde.
                                </p>
                            </div>

                            <div className="field">
                                <label htmlFor="datum">Veildatum</label>
                                <input
                                    id="datum"
                                    type="date"
                                    value={form.veilDatum}
                                    onChange={(e) => updateField("veilDatum", e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="field-row">
                            <div className="field">
                                <label htmlFor="plantDiameter">Plant diameter (cm)</label>
                                <input
                                    id="plantDiameter"
                                    type="number"
                                    min={0}
                                    step="0.1"
                                    value={form.plantDiameterCm}
                                    onChange={(e) =>
                                        updateField("plantDiameterCm", e.target.value)
                                    }
                                />
                            </div>
                            <div className="field">
                                <label htmlFor="plantLengte">Plant lengte (cm)</label>
                                <input
                                    id="plantLengte"
                                    type="number"
                                    min={0}
                                    step="0.1"
                                    value={form.plantLengteCm}
                                    onChange={(e) =>
                                        updateField("plantLengteCm", e.target.value)
                                    }
                                />
                            </div>
                        </div>

                        <div className="field">
                            <div className="field-labelRow">
                                <label htmlFor="potMaat">Potmaat</label>
                                <details className="aanv-tip">
                                    <summary
                                        className="aanv-tip__btn"
                                        aria-label="Toon uitleg potmaten"
                                        title="Uitleg potmaten"
                                    >
                                        ?
                                    </summary>
                                    <div className="aanv-tip__panel" role="note">
                                        <p className="aanv-tip__title">Potmaten (schema)</p>
                                        <div className="aanv-tip__tableWrap">
                                            <table className="aanv-tip__table">
                                                <thead>
                                                    <tr>
                                                        <th>Potmaat</th>
                                                        <th>LxBxH (cm)</th>
                                                        <th>Doorsnee (cm)</th>
                                                        <th>Volume (L)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {POTMATEN.map((p) => (
                                                        <tr key={p.code}>
                                                            <td>{p.code}</td>
                                                            <td>{p.lxbxh ?? "–"}</td>
                                                            <td>
                                                                {p.diameterCm
                                                                    ? `Ø${p.diameterCm}`
                                                                    : "–"}
                                                            </td>
                                                            <td>
                                                                {p.volumeL ?? "–"}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <p className="aanv-tip__hint">
                                            Tip: kies “Geen / onbekend” als je het niet zeker weet.
                                        </p>
                                    </div>
                                </details>
                            </div>
                            <select
                                id="potMaat"
                                value={form.potMaat}
                                onChange={(e) => updateField("potMaat", e.target.value)}
                            >
                                <option value="">Geen / onbekend</option>
                                {POTMATEN.map((p) => (
                                    <option key={p.code} value={p.code}>
                                        {p.code}
                                    </option>
                                ))}
                            </select>
                            {getPotmaat(form.potMaat) && (
                                <p className="aanv-help">
                                    {(() => {
                                        const p = getPotmaat(form.potMaat);
                                        if (!p) return null;
                                        const parts = [];
                                        if (p.lxbxh) parts.push(`LxBxH ${p.lxbxh} cm`);
                                        if (p.diameterCm) parts.push(`Ø${p.diameterCm} cm`);
                                        if (p.volumeL) parts.push(`${p.volumeL} L`);
                                        return parts.join(" • ");
                                    })()}
                                </p>
                            )}
                        </div>

                        <p className="aanv-help-inline">
                            De veilingmeester bepaalt de exacte tijd. Jij kiest de dag en locatie.
                        </p>

                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={handleResetForm}
                            >
                                Annuleren
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={saving || !gebruikerId}
                            >
                                {saving ? "Bezig…" : "Opslaan"}
                            </button>
                        </div>
                    </form>
                </section>

                {/* Mijn aanmeldingen */}
                <section className="aanv-panel">
                    <h2>Mijn aanmeldingen</h2>
                    {loadingData ? (
                        <p>Gegevens laden…</p>
                    ) : sortedAanmeldingen.length === 0 ? (
                        <p className="aanv-empty">
                            Je hebt nog geen producten aangemeld. Vul hierboven het formulier
                            in om een eerste kavel aan te melden.
                        </p>
                    ) : (
                        <table className="aanv-table">
                            <thead>
                            <tr>
                                <th>ID</th>
                                <th>Product</th>
                                <th>Categorie</th>
                                <th>Hoeveelheid</th>
                                <th>Minimumprijs</th>
                                <th>Veildatum</th>
                                <th>Status</th>
                            </tr>
                            </thead>
                            <tbody>
                            {sortedAanmeldingen.map((a) => {
                                const status = getAanmeldingStatus(a.gewensteVeilDatum);
                                return (
                                    <tr key={a.aanmeldingId}>
                                        <td>{a.aanmeldingId}</td>
                                        <td>{a.productBeschrijving}</td>
                                        <td>{a.categorie}</td>
                                        <td>{a.hoeveelheid}</td>
                                        <td>€ {formatCurrency(a.minimumPrijs)}</td>
                                        <td>{formatDate(a.gewensteVeilDatum)}</td>
                                        <td>
                        <span
                            className={`aanv-status-pill ${status.className}`}
                        >
                          {status.label}
                        </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    )}
                </section>

                {/* Mijn toewijzingen */}
                <section className="aanv-panel">
                    <h2>Mijn toewijzingen</h2>
                    {loadingData ? (
                        <p>Gegevens laden…</p>
                    ) : sortedToewijzingen.length === 0 ? (
                        <p className="aanv-empty">
                            Er zijn nog geen kavels toegewezen voor jouw producten.
                        </p>
                    ) : (
                        <table className="aanv-table">
                            <thead>
                            <tr>
                                <th>ID</th>
                                <th>Veilingproduct</th>
                                <th>Koper</th>
                                <th>Eindprijs</th>
                                <th>Datum</th>
                            </tr>
                            </thead>
                            <tbody>
                            {sortedToewijzingen.map((t) => (
                                <tr key={t.toewijzingId}>
                                    <td>{t.toewijzingId}</td>
                                    <td>{t.veilingProductId}</td>
                                    <td>{t.koperNaam}</td>
                                    <td>€ {formatCurrency(t.eindPrijs)}</td>
                                    <td>{formatDate(t.datum)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </section>
            </main>
        </div>
    );
}

