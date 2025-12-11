// src/pages/AanvoerderPage.jsx
// Aanvoerder-dashboard:
// - Producten aanmelden voor de veiling
// - Overzicht van eigen aanmeldingen
// - Overzicht van toewijzingen (verkochte kavels) + totale opbrengst

import React, { useEffect, useMemo, useState } from "react";
import "./AanvoerderPageStyle.css";
import apiFetch from "../api";

// Vastgestelde kloklocaties
const KLOK_LOCATIES = ["Naaldwijk", "Aalsmeer", "Rijnsburg", "Eelde"];

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

// Bepaal status van een aanmelding op basis van veildatum
function getAanmeldingStatus(iso) {
    if (!iso) return { label: "Onbekend", className: "aanv-status--unknown" };

    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return { label: "Onbekend", className: "aanv-status--unknown" };

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
        fotoUrl: "",
        productBeschrijving: "",
        hoeveelheid: 1,
        minimumPrijs: 0,
        categorie: "Snijbloemen",
        kloklocatie: "Naaldwijk",
        veilDatum: "",
    });

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

    // Stats voor bovenaan de pagina
    const stats = useMemo(() => {
        const totaalAanmeldingen = aanmeldingen.length;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const geplandeAanmeldingen = aanmeldingen.filter((a) => {
            if (!a.gewensteVeilDatum) return false;
            const d = new Date(a.gewensteVeilDatum);
            if (Number.isNaN(d.getTime())) return false;
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
                const da = new Date(a.gewensteVeilDatum ?? 0).getTime();
                const db = new Date(b.gewensteVeilDatum ?? 0).getTime();
                return da - db;
            }),
        [aanmeldingen]
    );

    const sortedToewijzingen = useMemo(
        () =>
            [...toewijzingen].sort((a, b) => {
                const da = new Date(a.datum ?? 0).getTime();
                const db = new Date(b.datum ?? 0).getTime();
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
        if (!form.productBeschrijving.trim()) {
            setError("Productbeschrijving is verplicht.");
            return;
        }
        if (!form.veilDatum) {
            setError("Kies een veildatum.");
            return;
        }

        // Client-side validatie voor hoeveelheid, prijs en datum
        const qty = Number(form.hoeveelheid);
        const minPrice = Number(form.minimumPrijs);

        if (!Number.isFinite(qty) || qty <= 0) {
            setError("Hoeveelheid moet groter zijn dan 0.");
            return;
        }

        if (!Number.isFinite(minPrice) || minPrice < 0) {
            setError("Minimumprijs kan niet negatief zijn.");
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

        try {
            setSaving(true);
            setMsg("Aanmelding opslaan…");

            const veilDatumIso = veilDate.toISOString();

            const payload = {
                fotoUrl: form.fotoUrl.trim() || null,
                productBeschrijving: form.productBeschrijving.trim(),
                hoeveelheid: qty,
                minimumPrijs: minPrice,
                categorie: form.categorie,
                gewensteKlokLocatie: form.kloklocatie.trim(),
                gewensteVeilDatum: veilDatumIso,
                gebruikerId: gebruikerId,
            };

            const created = await apiFetch("/Aanmeldingen", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            // nieuwe aanmelding bovenaan
            setAanmeldingen((prev) => [created, ...prev]);

            // formulier resetten
            setForm({
                fotoUrl: "",
                productBeschrijving: "",
                hoeveelheid: 1,
                minimumPrijs: 0,
                categorie: "Snijbloemen",
                kloklocatie: "Naaldwijk",
                veilDatum: "",
            });

            setMsg("✅ Aanmelding opgeslagen.");
        } catch (err) {
            setError(err?.message ?? "Opslaan van de aanmelding is mislukt.");
        } finally {
            setSaving(false);
        }
    }

    function handleResetForm() {
        setForm({
            fotoUrl: "",
            productBeschrijving: "",
            hoeveelheid: 1,
            minimumPrijs: 0,
            categorie: "Snijbloemen",
            kloklocatie: "Naaldwijk",
            veilDatum: "",
        });
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
                            <label htmlFor="foto">Foto-URL (optioneel)</label>
                            <input
                                id="foto"
                                type="url"
                                placeholder="https://…"
                                value={form.fotoUrl}
                                onChange={(e) => updateField("fotoUrl", e.target.value)}
                            />
                        </div>

                        <div className="field">
                            <label htmlFor="beschrijving">Productbeschrijving</label>
                            <input
                                id="beschrijving"
                                type="text"
                                value={form.productBeschrijving}
                                onChange={(e) =>
                                    updateField("productBeschrijving", e.target.value)
                                }
                                required
                            />
                            <p className="aanv-help">
                                Bijvoorbeeld: “Rozen rood 60cm, tros, 10 bossen per fust”.
                            </p>
                        </div>

                        <div className="field-row">
                            <div className="field">
                                <label htmlFor="categorie">Categorie</label>
                                <select
                                    id="categorie"
                                    value={form.categorie}
                                    onChange={(e) => updateField("categorie", e.target.value)}
                                    required
                                >
                                    <option value="Snijbloemen">Snijbloemen</option>
                                    <option value="Kamerplanten">Kamerplanten</option>
                                    <option value="Tuinplanten">Tuinplanten</option>
                                    <option value="Boomkwekerij">Boomkwekerij</option>
                                    <option value="Decoratiegroen">Decoratiegroen</option>
                                    <option value="Overig">Overig</option>
                                </select>
                            </div>
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

                        <p className="aanv-help-inline">
                            De veiling bepaalt de exacte tijd. Jij kiest de dag en locatie.
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