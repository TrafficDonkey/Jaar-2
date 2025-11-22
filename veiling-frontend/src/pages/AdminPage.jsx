// AdminPage.jsx
// Beheerpagina uitsluitend voor de rol 'Admin'.
// Toont een overzicht van alle gebruikers en laat de admin nieuwe accounts
// (Klant / Aanvoerder / Veilingmeester) aanmaken.

import React, { useEffect, useState } from "react";
import "./AdminPageStyle.css";
import apiFetch from "../api";

// Rol uit JWT-token lezen (fallback als localStorage geen 'role' heeft)
function getRoleFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const [_, payload] = token.split(".");
    const decoded = JSON.parse(atob(payload));
    const raw =
      decoded.role ||
      decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
    return raw || null;
  } catch {
    return null;
  }
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    naam: "",
    email: "",
    wachtwoord: "",
    rol: "Aanvoerder",
  });

  const [role, setRole] = useState(null);

  useEffect(() => {
    document.title = "FloraFlow — Beheer";

    const r = localStorage.getItem("role") || getRoleFromToken();
    setRole(r);

    async function load() {
      if (r !== "Admin") {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setMsg("");

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

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetForm() {
    setForm({
      naam: "",
      email: "",
      wachtwoord: "",
      rol: "Aanvoerder",
    });
  }

  function countByRole(r) {
    return users.filter((u) => (u.rol || "").toLowerCase() === r.toLowerCase())
      .length;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    setError("");

    if (!form.naam.trim() || !form.email.trim() || !form.wachtwoord.trim()) {
      setError("Vul naam, e-mail en wachtwoord in.");
      return;
    }

    try {
      setMsg("Account aanmaken…");

      await apiFetch("/auth/admin/create-user", {
        method: "POST",
        body: JSON.stringify({
          naam: form.naam.trim(),
          email: form.email.trim(),
          password: form.wachtwoord,
          rol: form.rol,
        }),
      });

      setMsg("✅ Account aangemaakt.");
      resetForm();

      const data = await apiFetch("/Gebruikers");
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message ?? "Account aanmaken is mislukt.");
      setMsg("");
    }
  }

  if (role !== "Admin") {
    return (
      <div className="page-shell admin-shell">
        <main className="admin-main">
          <section className="admin-panel admin-panel--narrow">
            <h1>Geen toegang</h1>
            <p className="admin-muted">
              Deze pagina is alleen beschikbaar voor beheerders (Admin).
            </p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="page-shell admin-shell">
      <main className="admin-main" aria-labelledby="admin-title">
        <section className="admin-panel">
          <header className="admin-header">
            <div>
              <h1 id="admin-title">Beheer gebruikers</h1>
              <p className="admin-sub">
                Bekijk alle accounts en maak nieuwe gebruikers aan namens
                kwekers en veilingmeesters.
              </p>
            </div>
          </header>

          {error && (
            <div className="admin-alert admin-alert--error" role="alert">
              ❌ {error}
            </div>
          )}
          {msg && !error && (
            <div className="admin-alert admin-alert--info" aria-live="polite">
              {msg}
            </div>
          )}

          <div className="admin-stats">
            <div className="admin-stat">
              <span className="admin-stat__label">Totaal accounts</span>
              <span className="admin-stat__value">{users.length}</span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat__label">Klanten</span>
              <span className="admin-stat__value">
                {countByRole("Klant")}
              </span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat__label">Aanvoerders</span>
              <span className="admin-stat__value">
                {countByRole("Aanvoerder")}
              </span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat__label">Veilingmeesters</span>
              <span className="admin-stat__value">
                {countByRole("Veilingmeester")}
              </span>
            </div>
          </div>
        </section>

        <section className="admin-panel admin-panel--narrow">
          <h2>Nieuw account aanmaken</h2>
          <p className="admin-muted">
            Gebruik dit formulier om namens een aanvoerder of veilingmeester
            een account aan te maken. Zelfregistratie blijft altijd rol
            <strong> Klant</strong>.
          </p>

          <form onSubmit={handleSubmit} className="admin-form" noValidate>
            <div className="field">
              <label htmlFor="naam">Naam</label>
              <input
                id="naam"
                value={form.naam}
                onChange={(e) => updateField("naam", e.target.value)}
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
                required
              />
            </div>

            <div className="field">
              <label htmlFor="pw">Tijdelijk wachtwoord</label>
              <input
                id="pw"
                type="password"
                value={form.wachtwoord}
                onChange={(e) => updateField("wachtwoord", e.target.value)}
                required
              />
            </div>

            <fieldset className="field">
              <legend>Rol</legend>
              <p className="admin-muted admin-muted--small">
                Admin-accounts worden handmatig in de database beheerd.
              </p>
              <label className="role-line">
                <input
                  type="radio"
                  name="rol"
                  value="Klant"
                  checked={form.rol === "Klant"}
                  onChange={(e) => updateField("rol", e.target.value)}
                />
                <span>Klant</span>
              </label>
              <label className="role-line">
                <input
                  type="radio"
                  name="rol"
                  value="Aanvoerder"
                  checked={form.rol === "Aanvoerder"}
                  onChange={(e) => updateField("rol", e.target.value)}
                />
                <span>Aanvoerder</span>
              </label>
              <label className="role-line">
                <input
                  type="radio"
                  name="rol"
                  value="Veilingmeester"
                  checked={form.rol === "Veilingmeester"}
                  onChange={(e) => updateField("rol", e.target.value)}
                />
                <span>Veilingmeester</span>
              </label>
            </fieldset>

            <div className="admin-actions">
              <button
                type="button"
                className="outline-btn"
                onClick={resetForm}
              >
                Leegmaken
              </button>
              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? "Bezig…" : "Account maken"}
              </button>
            </div>
          </form>
        </section>

        <section className="admin-panel">
          <h2>Alle gebruikers</h2>
          {loading ? (
            <p>Gegevens laden…</p>
          ) : users.length === 0 ? (
            <p className="admin-empty">Er zijn nog geen gebruikers gevonden.</p>
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
                      <td>
                        <span className="role-pill">{u.rol}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
