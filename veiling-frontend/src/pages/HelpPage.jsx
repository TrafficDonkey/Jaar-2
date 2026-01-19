import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./HelpPageStyle.css";

const roleLabels = {
  Koper: "Koper",
  Klant: "Koper",
  Aanvoerder: "Aanvoerder",
  Veilingmeester: "Veilingmeester",
  Admin: "Beheerder",
};

const helpContent = {
  Koper: {
    title: "Hulp voor kopers",
    intro:
      "Hier vind je de stappen om een product te kopen tijdens een veiling.",
    steps: [
      "Ga naar Kopen en kies links een actieve veiling.",
      "Wacht tot de veiling live is (of bekijk de starttijd).",
      "Kies het aantal stuks en klik op Koop tegen huidige prijs.",
      "Controleer je aankoop in de tab Mijn aankopen.",
      "Als de veiling voorbij is, kies een andere veiling.",
    ],
    tips: [
      "De prijs daalt tijdens de klok - wacht niet te lang.",
      "Gebruik de snelle knoppen voor 1, 5, 10, 50 of 100 stuks.",
      "Bekijk historische prijzen voor extra context.",
    ],
    links: [{ to: "/app/koper", label: "Ga naar Kopen" }],
  },
  Aanvoerder: {
    title: "Hulp voor aanvoerders",
    intro:
      "Je meldt producten aan en wacht daarna tot de veilingmeester de veiling start.",
    steps: [
      "Ga naar Aanvoerder en klik op Product aanmelden.",
      "Vul productnaam, categorie, hoeveelheid en minimumprijs in.",
      "Kies een veildatum en kloklocatie.",
      "Vul optioneel beschrijving, plant diameter, plant lengte en potmaat.",
      "Upload optioneel een foto en verstuur de aanmelding.",
      "Wacht tot de veilingmeester de veiling start.",
    ],
    tips: [
      "Gebruik duidelijke productnamen en categorieen voor beter overzicht.",
      "Een scherpe minimumprijs zorgt voor meer biedingen.",
    ],
    links: [{ to: "/app/aanvoerder", label: "Ga naar Aanvoerder" }],
  },
  Veilingmeester: {
    title: "Hulp voor veilingmeesters",
    intro:
      "Je start veilingen op basis van open aanmeldingen en bewaakt de ronde.",
    steps: [
      "Ga naar Veilingbeheer en open de tab Nieuwe veiling.",
      "Selecteer een aanmelding en start direct of plan een starttijd.",
      "Volg actieve veilingen en stop een veiling indien nodig.",
      "Controleer Archief voor afgeronde veilingen en resultaten.",
    ],
    tips: [
      "Plan starttijden om drukte te spreiden.",
      "Controleer open aanmeldingen onderaan de pagina.",
    ],
    links: [
      { to: "/app/veilingmeester", label: "Ga naar Veilingbeheer" },
    ],
  },
  Admin: {
    title: "Hulp voor beheerders",
    intro:
      "Beheerders maken accounts aan en beheren gebruikers.",
    steps: [
      "Ga naar Beheer en maak nieuwe accounts aan voor Aanvoerder of Veilingmeester.",
      "Gebruik een wachtwoord van minimaal 8 tekens met letters en cijfers.",
      "Controleer accounts in de lijst en verwijder indien nodig.",
    ],
    tips: [
      "Gebruik het juiste roltype zodat de gebruiker toegang krijgt.",
      "Gebruik een tijdelijk wachtwoord en laat het later wijzigen.",
    ],
    links: [{ to: "/app/admin", label: "Ga naar Beheer" }],
  },
};

const roleOptions = [
  { value: "Koper", label: "Koper" },
  { value: "Aanvoerder", label: "Aanvoerder" },
  { value: "Veilingmeester", label: "Veilingmeester" },
  { value: "Admin", label: "Beheerder" },
];

export default function HelpPage() {
  const role = sessionStorage.getItem("role") || "";
  const normalizedRole = role === "Klant" ? "Koper" : role;
  const [selectedRole, setSelectedRole] = useState(
    helpContent[normalizedRole] ? normalizedRole : "Koper"
  );

  useEffect(() => {
    document.title = "FloraFlow - Hulp";
  }, []);

  useEffect(() => {
    if (helpContent[normalizedRole]) {
      setSelectedRole(normalizedRole);
    }
  }, [normalizedRole]);

  const current = useMemo(
    () => helpContent[selectedRole] ?? helpContent.Koper,
    [selectedRole]
  );

  const showSwitcher = role === "Admin";
  const roleLabel = roleLabels[normalizedRole] || "Gebruiker";

  return (
    <div className="page-shell help-shell">
      <header className="help-header">
        <div>
          <h1>Hulp en instructies</h1>
          <p className="help-sub">
            Instructies voor jouw rol: <strong>{roleLabel}</strong>.
          </p>
        </div>
        {showSwitcher && (
          <div className="help-role-switch">
            <span>Bekijk hulp voor:</span>
            <div className="help-role-buttons">
              {roleOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={
                    "help-role-btn" +
                    (selectedRole === opt.value ? " is-active" : "")
                  }
                  onClick={() => setSelectedRole(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <section className="help-card">
        <div className="help-card-head">
          <h2>{current.title}</h2>
          <p className="help-intro">{current.intro}</p>
        </div>

        <div className="help-grid">
          <div className="help-block">
            <h3>Stappen</h3>
            <ol className="help-steps">
              {current.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          <div className="help-block">
            <h3>Tips</h3>
            <ul className="help-tips">
              {current.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>

        {current.links?.length > 0 && (
          <div className="help-links">
            {current.links.map((link) => (
              <Link key={link.to} to={link.to} className="help-link-btn">
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
