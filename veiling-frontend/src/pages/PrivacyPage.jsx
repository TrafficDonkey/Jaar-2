import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import "./PrivacyPageStyle.css";
import AppFooter from "../components/AppFooter";
import PublicTopbar from "../components/PublicTopbar";

export default function PrivacyPage() {
  const location = useLocation();
  const isAppRoute = location.pathname.startsWith("/app");
  useEffect(() => {
    document.title = "Privacyverklaring";
  }, []);

  const lastUpdated = "19 januari 2026";

  return (
    <>
      {!isAppRoute && <PublicTopbar />}
      <div className="privacy-shell">
        <main className="privacy-main" aria-labelledby="privacy-title">
          <section className="privacy-card">
          <header className="privacy-header">
            <h1 id="privacy-title">Privacyverklaring</h1>
            <p className="privacy-sub">Laatst bijgewerkt: {lastUpdated}</p>
          </header>

          <p className="privacy-lead">
            In deze verklaring leggen we uit welke persoonsgegevens we verwerken,
            waarom we dat doen, hoe lang we ze bewaren en welke keuzes je hebt.
          </p>

          <section className="privacy-section" aria-label="Welke data">
            <h2>Welke data we verzamelen</h2>
            <ul>
              <li>
                <strong>Accountgegevens:</strong> naam, e-mailadres en (indien
                ingevuld) telefoon/land/adresgegevens.
              </li>
              <li>
                <strong>Authenticatie &amp; sessie:</strong> een login-token
                (JWT) en je rol/gebruikers-id (opgeslagen in{" "}
                <code>sessionStorage</code>).
              </li>
              <li>
                <strong>Voorkeuren:</strong> thema (donker/licht),
                notificatie-instelling, laatst gebruikte e-mailadres, en je
                cookie-keuzes (opgeslagen in <code>localStorage</code>).
              </li>
              <li>
                <strong>Technische gegevens:</strong> IP-adres, user-agent en
                serverlogs (bijv. voor beveiliging en troubleshooting).
              </li>
              <li>
                <strong>Cookies/vergelijkbare opslag:</strong> we gebruiken
                functionele opslag om de site te laten werken en voorkeuren te
                onthouden. Trackingcookies staan standaard uit en vereisen
                toestemming.
              </li>
            </ul>
          </section>

          <section className="privacy-section" aria-label="Waarom">
            <h2>Waarom we dit doen</h2>
            <ul>
              <li>
                <strong>Account aanmaken en beheren</strong> (registratie,
                profiel, rollen).
              </li>
              <li>
                <strong>Inloggen en beveiligen</strong> (toegang tot{" "}
                <code>/app</code>, voorkomen van misbruik).
              </li>
              <li>
                <strong>Functionele werking</strong> (notificaties, instellingen,
                gebruikerservaring).
              </li>
              <li>
                <strong>Verbeteren</strong> (alleen als je analytics/statistiek
                toestaat).
              </li>
            </ul>
          </section>

          <section className="privacy-section" aria-label="Bewaartermijnen">
            <h2>Hoe lang we het bewaren</h2>
            <ul>
              <li>
                <strong>Accountgegevens:</strong> zolang je account bestaat, of
                totdat je je account verwijdert.
              </li>
              <li>
                <strong>Sessiegegevens (token/rol):</strong> tot je uitlogt of je
                browser sluit (session storage).
              </li>
              <li>
                <strong>Voorkeuren (thema/cookies):</strong> totdat je ze
                verwijdert in je browser of je voorkeuren wijzigt.
              </li>
              <li>
                <strong>Serverlogs:</strong> beperkt bewaard (bijv. voor
                beveiliging en foutanalyse).
              </li>
            </ul>
          </section>

          <section className="privacy-section" aria-label="Delen">
            <h2>Met wie we data delen</h2>
            <ul>
              <li>
                <strong>Hosting/infra:</strong> onze hostingprovider verwerkt
                technisch noodzakelijke gegevens (zoals IP in logs).
              </li>
              <li>
                <strong>Analytics/marketing:</strong> alleen als je hiervoor
                toestemming geeft. Standaard staan deze uit.
              </li>
            </ul>
            <p className="privacy-note">
              We verkopen je gegevens niet.
            </p>
          </section>

          <section className="privacy-section" aria-label="Jouw rechten">
            <h2>Jouw rechten en data verwijderen</h2>
            <ul>
              <li>
                Je kunt je gegevens inzien en wijzigen via{" "}
                <Link to="/app/instellingen">Instellingen</Link>.
              </li>
              <li>
                Je kunt je account verwijderen via{" "}
                <Link to="/app/instellingen">Instellingen</Link> (sectie{" "}
                “Account verwijderen”).
              </li>
              <li>
                Je kunt je cookie-keuze aanpassen via{" "}
                <Link to="/cookies">Cookie-instellingen</Link>.
              </li>
            </ul>
          </section>

          <section className="privacy-section" aria-label="Contact">
            <h2>Contact</h2>
            <p className="privacy-note">
              Voor privacyvragen of een verwijderverzoek kun je contact opnemen
              met de beheerder van deze applicatie.
            </p>
          </section>

          <div className="privacy-actions" aria-label="Navigatie">
            <Link to="/" className="privacy-back">
              Terug naar home
            </Link>
          </div>
          </section>
        </main>
        {!isAppRoute && <AppFooter />}
      </div>
    </>
  );
}
