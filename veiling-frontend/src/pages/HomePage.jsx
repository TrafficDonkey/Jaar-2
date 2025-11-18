// src/pages/HomePage.jsx
// Rol-neutrale landingspagina (geen data-fetch, geen rolbadge).
// Toont hero, voordelen, stappenplan en CTA’s. CTA toont altijd Registreren + Inloggen.

import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import "./HomePageStyle.css";

export default function HomePage() {

  useEffect(() => {
    document.title = "Homepage";
  }, []);
  // ────────────────────────────── Weergave ──────────────────────────────
  return (
    <div className="lp-shell">
      {/* ───────── Hero: korte pitch + primaire CTA’s ───────── */}
      <header className="lp-hero" aria-labelledby="lp-title">
        <div className="lp-hero__content">
          <h1 id="lp-title" className="lp-hero__title">
            Verbinding tussen kwekers en kopers.
          </h1>
          <p className="lp-hero__sub">
            Eén moderne omgeving om producten aan te bieden, te ontdekken en veilig te verhandelen—van planning tot toewijzing.
          </p>

          {/* Toon altijd beide keuzes: registreren of inloggen */}
          <div className="lp-cta">
            <Link to="/register" className="btn btn--primary">Account aanmaken</Link>
            <Link to="/login" className="btn btn--ghost">Inloggen</Link>
          </div>

          <p className="lp-trust">Betrouwbaar. Schaalbaar. Ontworpen voor de sierteeltketen.</p>
        </div>

        {/* Decoratieve illustratie (geen functionele content) */}
        <div className="lp-hero__art" aria-hidden="true">
          <div className="lp-blob" />
          <div className="lp-card lp-card--floating">
            <span className="lp-dot" /> Live veilingen
          </div>
          <div className="lp-card lp-card--floating2">
            <span className="lp-dot" /> Transparante prijzen
          </div>
        </div>
      </header>

      {/* ───────── Voordelen ───────── */}
      <section className="lp-section" aria-labelledby="benefits-title">
        <h2 id="benefits-title" className="lp-section__title">Waarom dit platform?</h2>
        <ul className="lp-benefits">
          <li className="lp-benefit">
            <div className="lp-ico" aria-hidden="true">⚡</div>
            <h3>Snelle afhandeling</h3>
            <p>Gestroomlijnde processen van aanmelden tot toewijzing.</p>
          </li>
          <li className="lp-benefit">
            <div className="lp-ico" aria-hidden="true">🔒</div>
            <h3>Veilige transacties</h3>
            <p>Bewezen authenticatie en duidelijke toewijzingsregels.</p>
          </li>
          <li className="lp-benefit">
            <div className="lp-ico" aria-hidden="true">📈</div>
            <h3>Inzicht &amp; overzicht</h3>
            <p>Heldere dashboards en rapportage zodra je bent ingelogd.</p>
          </li>
        </ul>
      </section>

      {/* ───────── Hoe het werkt ───────── */}
      <section className="lp-section lp-section--alt" aria-labelledby="how-title">
        <h2 id="how-title" className="lp-section__title">Hoe het werkt</h2>
        <ol className="lp-steps">
          <li className="lp-step">
            <span className="lp-step__nr">1</span>
            <h3>Maak een account</h3>
            <p>Registreren kost een minuut. Je krijgt toegang tot je eigen omgeving.</p>
          </li>
          <li className="lp-step">
            <span className="lp-step__nr">2</span>
            <h3>Ontdek of bied</h3>
            <p>Bekijk aanbod of start met aanbieden — jij bepaalt je doel.</p>
          </li>
          <li className="lp-step">
            <span className="lp-step__nr">3</span>
            <h3>Rond veilig af</h3>
            <p>Transparante toewijzing en overzichtelijke afhandeling.</p>
          </li>
        </ol>
      </section>

      {/* ───────── CTA-strip ───────── */}
      <section className="lp-ctaStrip" aria-label="Call to action">
        <div className="lp-ctaStrip__box">
          <h2 className="lp-ctaStrip__title">Klaar om te starten?</h2>
          <p className="lp-ctaStrip__sub">Maak gratis een account of log in om verder te gaan.</p>

          {/* Ook hier altijd beide knoppen */}
          <div className="lp-cta lp-cta--center">
            <Link to="/register" className="btn btn--primary">Account aanmaken</Link>
            <Link to="/login" className="btn btn--ghost">Ik heb al een account</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
