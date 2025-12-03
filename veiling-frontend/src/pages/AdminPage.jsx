// AdminPage.jsx
// Beheerpagina voor rol "Admin".
// Toont overzicht van alle gebruikers en biedt een formulier
// om namens aanvoerders / veilingmeesters accounts aan te maken.

import React, { useEffect, useMemo, useState } from "react";
import "./AdminPageStyle.css";
import apiFetch from "../api";

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    naam: "",
    email: "",
    pw: "",
    pw2: "",
    rol: "Aanvoerder",
  });

  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  // ────────────────────────────── Helpers ──────────────────────────────

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // Heel eenvoudige password check (zelfde ideeën als registratie)
  function validatePassword(pw, pw2) {
    if (!pw) return "Wachtwoord is verplicht.";
    if (pw.length < 6) return "Wachtwoord moet minstens 6 tekens hebben.";
    if (!/[A-Z]/.test(pw)) return "Minstens één hoofdletter vereist.";
    if (!/[a-z]/.test(pw)) return "Minstens één kleine letter vereist.";
    if (!/[0-9]/.test(pw)) return "Minstens één cijfer vereist.";
    if (pw !== pw2) return "Beide wachtwoorden moeten gelijk zijn.";
    return null;
  }

  // Stats uit users berekenen
  const stats = useMemo(() => {
    const totaal = users.length;
    const klanten = users.filter((u) => u.rol === "Klant").length;
    const aanvoerders = users.filter((u) => u.rol === "Aanvoerder").length;
    const veilingmeesters = users.filter((u) => u.rol === "Veilingmeester").length;
    return { totaal, klanten, aanvoerders, veilingmeesters };
  }, [users]);

  // ────────────────────────────── Data laden ──────────────────────────────

  useEffect(() => {
    document.title = "FloraFlow — Admin";

    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await apiFetch("/Gebruikers");
        setUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err?.message ?? "Kon gebruikers niet laden.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function reloadUsers() {
    try {
      const data = await apiFetch("/Gebruikers");
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      // niet kritisch voor UX
    }
  }

  // ────────────────────────────── Account aanmaken ──────────────────────────────

  async function handleCreate(e) {
    e.preventDefault();
    setMsg("");
    setError("");

    const pwError = validatePassword(form.pw, form.pw2);
    if (pwError) {
      setError(pwError);
      return;
    }

    if (!form.naam.trim() || !form.email.trim()) {
      setError("Naam en e-mailadres zijn verplicht.");
      return;
    }

    try {
      setLoading(true);

      // ⚠️ BELANGRIJK: property moet "Wachtwoord" heten in je C#-DTO.
      // JSON key is dan "wachtwoord" (case-insensitive binding).
      const payload = {
        naam: form.naam.trim(),
        email: form.email.trim(),
        wachtwoord: form.pw,     // <-- dit miste eerder, daardoor 400
        rol: form.rol,
      };

      const created = await apiFetch("/auth/admin/create-user", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setMsg(
        `✅ Account aangemaakt voor ${created?.naam ?? payload.naam} als ${payload.rol}.`
      );
      setError("");

      // formulier leegmaken (rol laten staan)
      setForm((prev) => ({
        ...prev,
        naam: "",
        email: "",
        pw: "",
        pw2: "",
      }));

      // lijst opnieuw laden zodat nieuwe gebruiker zichtbaar wordt + stats updaten
      await reloadUsers();
    } catch (err) {
      setError(err?.message ?? "Kon account niet aanmaken.");
      setMsg("");
    } finally {
      setLoading(false);
    }
  }

  // ────────────────────────────── Render ──────────────────────────────

  return (
    <div className="page-shell admin-shell">
      <main className="admin-main" aria-labelledby="admin-title">
        <header className="admin-header">
          <h1 id="admin-title">Accountbeheer</h1>
          <p className="admin-sub">
            Overzicht van alle accounts en de mogelijkheid om namens
            aanvoerders en veilingmeesters nieuwe gebruikers aan te maken.
          </p>
        </header>

        {/* Statistieken */}
        <section
          className="admin-statsRow"
          aria-label="Overzicht van accounts per rol"
        >
          <article className="admin-statCard">
            <p className="admin-statLabel">Totaal accounts</p>
            <p className="admin-statValue">{stats.totaal}</p>
          </article>
          <article className="admin-statCard">
            <p className="admin-statLabel">Klanten</p>
            <p className="admin-statValue">{stats.klanten}</p>
          </article>
          <article className="admin-statCard">
            <p className="admin-statLabel">Aanvoerders</p>
            <p className="admin-statValue">{stats.aanvoerders}</p>
          </article>
          <article className="admin-statCard">
            <p className="admin-statLabel">Veilingmeesters</p>
            <p className="admin-statValue">{stats.veilingmeesters}</p>
          </article>
        </section>

        {/* Nieuw account aanmaken */}
        <section className="admin-createSection">
          <div className="admin-card admin-card--wide">
            <h2>Nieuw account aanmaken</h2>
            <p className="admin-cardSub">
              Gebruik dit formulier om namens een{" "}
              <strong>aanvoerder</strong> of{" "}
              <strong>veilingmeester</strong> een account aan te maken.
              Zelfregistratie via de website blijft rol <strong>Klant</strong>.
            </p>

            {error && (
              <div className="admin-alert admin-alert--error" role="alert">
                ❌ {error}
              </div>
            )}
            {msg && !error && (
              <div className="admin-alert admin-alert--ok" role="status">
                {msg}
              </div>
            )}

            <form className="admin-form" onSubmit={handleCreate} noValidate>
              <div className="field">
                <label htmlFor="naam">Naam</label>
                <input
                  id="naam"
                  type="text"
                  value={form.naam}
                  onChange={(e) => updateField("naam", e.target.value)}
                  placeholder="Bijv. Jan de Kweker"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="email">E-mailadres</label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="bijv. jan@example.com"
                  required
                />
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="pw">Tijdelijk wachtwoord</label>
                  <input
                    id="pw"
                    type="password"
                    value={form.pw}
                    onChange={(e) => updateField("pw", e.target.value)}
                    placeholder="Min. 6 tekens, 1 hoofdletter, 1 cijfer"
                    autoComplete="new-password"
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="pw2">Wachtwoord herhalen</label>
                  <input
                    id="pw2"
                    type="password"
                    value={form.pw2}
                    onChange={(e) => updateField("pw2", e.target.value)}
                    placeholder="Voer hetzelfde wachtwoord in"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <div className="pw-hints">
                <p className="pw-hints__title">Wachtwoordeisen</p>
                <ul>
                  <li>Minimaal 6 tekens lang</li>
                  <li>Minstens één hoofdletter (A-Z)</li>
                  <li>Minstens één kleine letter (a-z)</li>
                  <li>Minstens één cijfer (0-9)</li>
                </ul>
              </div>

              <div className="field">
                <label htmlFor="rol">Rol</label>
                <select
                  id="rol"
                  value={form.rol}
                  onChange={(e) => updateField("rol", e.target.value)}
                >
                  <option value="Aanvoerder">Aanvoerder</option>
                  <option value="Veilingmeester">Veilingmeester</option>
                </select>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      naam: "",
                      email: "",
                      pw: "",
                      pw2: "",
                    }))
                  }
                >
                  Leegmaken
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={loading}
                >
                  {loading ? "Bezig…" : "Account aanmaken"}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Overzicht van accounts */}
        <section className="admin-tableSection">
          <div className="admin-card">
            <h2>Alle accounts</h2>
            {loading && users.length === 0 ? (
              <p>Gegevens laden…</p>
            ) : users.length === 0 ? (
              <p>Er zijn nog geen accounts gevonden.</p>
            ) : (
              <div className="admin-tableWrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Naam</th>
                      <th>E-mail</th>
                      <th>Rol</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.gebruikerId}>
                        <td>{u.gebruikerId}</td>
                        <td>{u.naam}</td>
                        <td>{u.email}</td>
                        <td>{u.rol}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
