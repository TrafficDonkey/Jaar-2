// KoperPage.jsx
// Koper ziet: lijst met actieve veilingen (links) + details/klok van geselecteerde veiling (rechts).
// Klikken op een veiling laadt nu correct een product in de rechterkolom.

import React, { useEffect, useMemo, useState } from "react";
import apiFetch from "../api";
import "./KoperPageStyle.css";
import AuctionClock from "../components/AuctionClock";

const fmtDateTime = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
};

export default function KoperPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Huidige geselecteerde veiling (in ActieveVeilingDto-vorm)
  const [veiling, setVeiling] = useState(null);

  // Alle actieve veilingen uit /Veilingen
  const [actieveVeilingen, setActieveVeilingen] = useState([]);

  const [remainingQty, setRemainingQty] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [clockRunId, setClockRunId] = useState(0);

  const [koopAantal, setKoopAantal] = useState("");
  const [koopMsg, setKoopMsg] = useState("");

  // Welke veiling is geselecteerd in de lijst
  const [selectedVeilingId, setSelectedVeilingId] = useState(null);

  useEffect(() => {
    document.title = "Veiling — Kopen";

    async function load() {
      setLoading(true);
      setErr("");
      setKoopMsg("");

      try {
        // 1) Huidige actieve veiling (ActieveVeilingDto)
        const actieve = await apiFetch("/Veilingen/actief");
        setVeiling(actieve ?? null);
        setSelectedVeilingId(actieve?.veilingId ?? null);

        // 2) Alle veilingen ophalen en filteren op status "Actief"
        try {
          const alle = await apiFetch("/Veilingen");
          const actief = (alle ?? []).filter(
            (v) =>
              v.status &&
              typeof v.status === "string" &&
              v.status.toLowerCase() === "actief"
          );
          setActieveVeilingen(actief);
        } catch {
          setActieveVeilingen([]);
        }
      } catch (e) {
        setErr(e?.message ?? "Kon actieve veiling niet laden.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const product = veiling?.huidigProduct ?? null;

  // Zodra er een (nieuw) product is: voorraad instellen en klok herstarten
  useEffect(() => {
    if (product) {
      setRemainingQty(product.hoeveelheid ?? 0);
      setClockRunId((id) => id + 1);
      setKoopAantal("");
      setKoopMsg("");
    } else {
      setRemainingQty(0);
    }
  }, [product?.aanmeldingId]);

  const { minPrice, maxPrice, durationSeconds } = useMemo(() => {
    if (!product) {
      return { minPrice: 0, maxPrice: 0, durationSeconds: 60 };
    }
    const min = product.minimumPrijs ?? 0;
    const max = min > 0 ? min * 2 : 100; // demo: 2x minimum
    const duration = 45; // docent: “binnen een minuut of korter”

    return { minPrice: min, maxPrice: max, durationSeconds: duration };
  }, [product]);

  // ░░░ SELECTEER VEILING ░░░
  async function selectVeilingById(id) {
    if (!id) return;
    if (id === selectedVeilingId) return; // al geselecteerd

    setErr("");
    setLoading(true);

    try {
      // /Veilingen/{id} geeft een VeilingDto terug:
      // { veilingId, naam, status, startTijd, eindTijd, veilingProducten:[...] }
      const v = await apiFetch(`/Veilingen/${id}`);
      if (!v) {
        setVeiling(null);
        setSelectedVeilingId(id);
        return;
      }

      // Pak het eerste veilingProduct (we kunnen later nog sorteren op volgorde)
      const vp = (v.veilingProducten ?? [])[0];

      // Map dit naar een "huidigProduct" in de vorm van ActieveVeilingProductDto
      const mappedProduct = vp
        ? {
            veilingProductId: vp.veilingProductId,
            aanmeldingId: vp.aanmeldingId,
            productBeschrijving: vp.productBeschrijving,
            hoeveelheid: vp.aantal,
            minimumPrijs: vp.startPrijs ?? 0,
            // foto hebben we hier niet; kan later uit backend komen
            fotoUrl: vp.fotoUrl ?? null,
            kloklocatie: vp.kloklocatie ?? "",
          }
        : null;

      const mappedVeiling = {
        veilingId: v.veilingId,
        startTijd: v.startTijd,
        eindTijd: v.eindTijd,
        huidigProduct: mappedProduct,
      };

      setVeiling(mappedVeiling);
      setSelectedVeilingId(id);

      // Optioneel: lijst van actieve veilingen opnieuw ophalen
      try {
        const alle = await apiFetch("/Veilingen");
        const actief = (alle ?? []).filter(
          (x) =>
            x.status &&
            typeof x.status === "string" &&
            x.status.toLowerCase() === "actief"
        );
        setActieveVeilingen(actief);
      } catch {
        /* ignore */
      }
    } catch (e) {
      setErr(e?.message ?? "Kon veiling niet laden.");
    } finally {
      setLoading(false);
    }
  }

  function handleKoop(e) {
    e?.preventDefault?.();
    setKoopMsg("");

    if (!product) return;
    if (currentPrice == null) {
      setKoopMsg("Wacht tot de klok gestart is.");
      return;
    }

    const qty = Number(String(koopAantal).replace(",", "."));
    if (!qty || qty <= 0) {
      setKoopMsg("Voer een geldig aantal in.");
      return;
    }

    if (qty > remainingQty) {
      setKoopMsg(
        `Er zijn nog maar ${remainingQty} eenheden beschikbaar.`
      );
      return;
    }

    const totaal = currentPrice * qty;

    // Demo: nog geen echte backend-koppeling
    setKoopMsg(
      `Je koopt ${qty}× "${product.productBeschrijving}" voor €${currentPrice.toFixed(
        2
      )} per stuk (totaal €${totaal.toFixed(
        2
      )}). (Demo – wordt nog niet opgeslagen.)`
    );

    const rest = remainingQty - qty;
    setRemainingQty(rest);
    setKoopAantal("");

    if (rest > 0) {
      // Nog producten → klok opnieuw vanaf max
      setClockRunId((id) => id + 1);
    } else {
      // Alles verkocht → hier kun je later "volgend product" uit de backend halen
    }
  }

  return (
    <div className="kop-shell">
      <header className="kop-head">
        <h1>Veiling — Kopen</h1>
      </header>

      {err && (
        <div className="kop-alert" role="alert">
          ❌ {err}
        </div>
      )}

      {loading ? (
        <p>Actieve veiling laden…</p>
      ) : !product ? (
        <p className="kop-empty">Geen actief product gevonden.</p>
      ) : (
        <div className="kop-layout">
          {/* LINKERKOLOM: VEILINGEN */}
          <aside className="kop-left">
            <h2 className="kop-section-title">Veilingen</h2>

            <div className="kop-veiling-list">
              {/* Huidige geselecteerde veiling (bovenaan) */}
              {veiling && (
                <button
                  className={`kop-veiling-card ${
                    selectedVeilingId === veiling.veilingId
                      ? "kop-veiling-card--active"
                      : ""
                  }`}
                  onClick={() => selectVeilingById(veiling.veilingId)}
                  aria-pressed={selectedVeilingId === veiling.veilingId}
                >
                  <h3>Huidige veiling</h3>
                  <p className="kop-veiling-meta">
                    #{veiling.veilingId} •{" "}
                    {fmtDateTime(veiling.startTijd)} –{" "}
                    {veiling.eindTijd
                      ? fmtDateTime(veiling.eindTijd)
                      : "nog open"}
                  </p>
                  <p className="kop-veiling-prod">
                    {product.productBeschrijving}
                  </p>
                </button>
              )}

              {/* Andere actieve veilingen — klikbaar */}
              {actieveVeilingen
                .filter((v) => v.veilingId !== veiling?.veilingId)
                .map((v) => (
                  <button
                    key={v.veilingId}
                    className={`kop-veiling-card kop-veiling-card--placeholder ${
                      selectedVeilingId === v.veilingId
                        ? "kop-veiling-card--active"
                        : ""
                    }`}
                    type="button"
                    onClick={() => selectVeilingById(v.veilingId)}
                    aria-pressed={selectedVeilingId === v.veilingId}
                  >
                    <h3>Actieve veiling</h3>
                    <p className="kop-veiling-meta">
                      #{v.veilingId} • {fmtDateTime(v.startTijd)} –{" "}
                      {v.eindTijd ? fmtDateTime(v.eindTijd) : "nog open"}
                    </p>
                    {v.naam && <p className="kop-veiling-prod">{v.naam}</p>}
                  </button>
                ))}

              {actieveVeilingen.filter(
                (v) => v.veilingId !== veiling?.veilingId
              ).length === 0 && (
                <div className="kop-veiling-card kop-veiling-card--placeholder">
                  Geen andere actieve veilingen.
                </div>
              )}
            </div>
          </aside>

          {/* RECHTERKOLOM: DETAIL + KLOK */}
          <main className="kop-right">
            <section className="kop-detail-card">
              <div className="kop-detail-left">
                <h2>Huidig product</h2>
                <p className="kop-prod-title">
                  {product.productBeschrijving}
                </p>

                <dl className="kop-prod-dl">
                  <div>
                    <dt>Hoeveelheid totaal</dt>
                    <dd>{product.hoeveelheid}</dd>
                  </div>
                  <div>
                    <dt>Beschikbaar</dt>
                    <dd>{remainingQty}</dd>
                  </div>
                  <div>
                    <dt>Minimumprijs</dt>
                    <dd>€ {minPrice.toFixed(2)}</dd>
                  </div>
                  {product.kloklocatie && (
                    <div>
                      <dt>Kloklocatie</dt>
                      <dd>{product.kloklocatie}</dd>
                    </div>
                  )}
                </dl>

                {product.fotoUrl && (
                  <img
                    src={product.fotoUrl}
                    alt={product.productBeschrijving}
                    className="kop-prod-img"
                  />
                )}

                <p className="kop-extra-text">
                  De veilingmeester laat de prijs binnen{" "}
                  {durationSeconds} seconden dalen van de
                  startprijs naar de minimumprijs. Jij klikt op
                  koop zodra de prijs goed is voor jou.
                </p>
              </div>

              <div className="kop-detail-right">
                <AuctionClock
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  durationSeconds={durationSeconds}
                  runId={clockRunId}
                  onPriceChange={(p) => setCurrentPrice(p)}
                  onFinished={() => {
                    // hier kun je extra logic toevoegen als de klok afloopt
                  }}
                />

                <form className="kop-koop-form" onSubmit={handleKoop}>
                  <label htmlFor="koopAantal">
                    Aantal dat je wilt kopen
                  </label>
                  <input
                    id="koopAantal"
                    type="number"
                    min="1"
                    max={remainingQty || 1}
                    value={koopAantal}
                    onChange={(e) => setKoopAantal(e.target.value)}
                    placeholder="Bijv. 3"
                  />
                  <button
                    type="submit"
                    className="btn btn-primary kop-koop-btn"
                    disabled={remainingQty <= 0}
                  >
                    Koop voor huidige prijs
                  </button>
                </form>

                {koopMsg && (
                  <p className="kop-bid-msg" aria-live="polite">
                    {koopMsg}
                  </p>
                )}
              </div>
            </section>
          </main>
        </div>
      )}
    </div>
  );
}
