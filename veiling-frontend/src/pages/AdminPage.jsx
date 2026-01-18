// AdminPage.jsx
// Beheerpagina voor rol "Admin".
// Toont overzicht van alle gebruikers en biedt een formulier
// om namens aanvoerders / veilingmeesters accounts aan te maken.

import React, { useEffect, useMemo, useState } from "react";
import "./AdminPageStyle.css";
import apiFetch from "../api";
import MessageCenter from "../components/MessageCenter";
import {
  passwordHints,
  passwordPlaceholder,
  validatePassword,
} from "../utils/passwordRules";

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [form, setForm] = useState({
    naam: "",
    email: "",
    pw: "",
    pw2: "",
    rol: "Aanvoerder",
  });

  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);

  // Helpers

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function pushMessage(type, text, details) {
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

  // Password check gelijk aan registratie

  // Stats uit users berekenen
  const stats = useMemo(() => {
    const visibleUsers = users.filter((u) => {
      const email = String(u.email ?? "").toLowerCase();
      const naam = String(u.naam ?? "").toLowerCase();
      return !email.endsWith("@deleted.invalid") && naam !== "verwijderd account";
    });

    const totaal = visibleUsers.length;
    const klanten = visibleUsers.filter((u) => u.rol === "Klant").length;
    const aanvoerders = visibleUsers.filter((u) => u.rol === "Aanvoerder").length;
    const veilingmeesters = visibleUsers.filter((u) => u.rol === "Veilingmeester").length;
    return { totaal, klanten, aanvoerders, veilingmeesters };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const visibleUsers = users.filter((u) => {
      const email = String(u.email ?? "").toLowerCase();
      const naam = String(u.naam ?? "").toLowerCase();
      return !email.endsWith("@deleted.invalid") && naam !== "verwijderd account";
    });

    const q = searchQuery.trim().toLowerCase();
    if (!q) return visibleUsers;
    return visibleUsers.filter((u) => {
      const id = String(u.gebruikerId ?? "");
      const naam = String(u.naam ?? "").toLowerCase();
      const email = String(u.email ?? "").toLowerCase();
      const rol = String(u.rol ?? "").toLowerCase();
      return (
        id.includes(q) ||
        naam.includes(q) ||
        email.includes(q) ||
        rol.includes(q)
      );
    });
  }, [users, searchQuery]);

  // Data laden

  useEffect(() => {
    document.title = "FloraFlow - Admin";

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

  async function handleDeleteUser() {
    if (!deleteTarget) return;
    if (deleteConfirm.trim() !== "Delete") {
      setDeleteError("Type Delete om te bevestigen.");
      return;
    }

    setDeleteLoading(true);
    setDeleteError("");
    try {
      await apiFetch(`/Gebruikers/${deleteTarget.gebruikerId}`, {
        method: "DELETE",
      });
      const successText = `Account verwijderd: ${deleteTarget.naam ?? deleteTarget.email ?? "Onbekend"}.`;
      setMsg(successText);
      pushMessage("success", successText);
      await reloadUsers();
      setDeleteTarget(null);
      setDeleteConfirm("");
    } catch (err) {
      const message = err?.message ?? "Verwijderen van account mislukt.";
      setDeleteError(message);
      pushMessage("error", message);
    } finally {
      setDeleteLoading(false);
    }
  }

  // Account aanmaken

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

      // BELANGRIJK: property moet "Wachtwoord" heten in je C#-DTO.
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

      const successText = `Account aangemaakt voor ${created?.naam ?? payload.naam} als ${payload.rol}.`;
      setMsg(successText);
      pushMessage("success", successText);
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
      const message = err?.message ?? "Kon account niet aanmaken.";
      setError(message);
      setMsg("");
      pushMessage("error", message);
    } finally {
      setLoading(false);
    }
  }

  // Render

  return (
    <div className="page-shell admin-shell">
      <main className="admin-main" aria-labelledby="admin-title">
        <section className="admin-panel">
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
                  Fout: {error}
                </div>
              )}
              {msg && !error && (
                <div className="admin-alert admin-alert--ok" role="status">
                  {msg}
                </div>
              )}

              <MessageCenter
                title="Berichten"
                messages={messages}
                onClear={() => setMessages([])}
              />

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
                      placeholder={passwordPlaceholder}
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
                    {passwordHints.map((hint) => (
                      <li key={hint}>{hint}</li>
                    ))}
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
                    {loading ? "Bezig..." : "Account aanmaken"}
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
                <p>Gegevens laden...</p>
              ) : users.length === 0 ? (
                <p>Er zijn nog geen accounts gevonden.</p>
              ) : (
                <>
                  {filteredUsers.length === 0 ? (
                    <p>Geen accounts gevonden voor deze zoekopdracht.</p>
                  ) : (
                    <div className="admin-tableWrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Naam</th>
                            <th>E-mail</th>
                            <th>Rol</th>
                            <th>Actie</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map((u) => (
                            <tr key={u.gebruikerId}>
                              <td>{u.gebruikerId}</td>
                              <td>{u.naam}</td>
                              <td>{u.email}</td>
                              <td>{u.rol}</td>
                              <td>
                                <button
                                  type="button"
                                  className="admin-delete-btn"
                                  aria-label={`Verwijder account ${u.naam ?? u.email ?? u.gebruikerId}`}
                                  onClick={() => {
                                    setDeleteTarget(u);
                                    setDeleteConfirm("");
                                    setDeleteError("");
                                  }}
                                  disabled={
                                    deleteLoading &&
                                    deleteTarget?.gebruikerId === u.gebruikerId
                                  }
                                >
                                  X
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="admin-search">
                    <label htmlFor="adminSearch">Snel zoeken</label>
                    <div className="admin-search-row">
                      <input
                        id="adminSearch"
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Zoek op naam, e-mail, rol of ID"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          className="admin-search-clear"
                          onClick={() => setSearchQuery("")}
                        >
                          Wis
                        </button>
                      )}
                    </div>
                  </div>

                  {deleteTarget && (
                    <div
                      className="admin-deleteBox"
                      role="dialog"
                      aria-modal="true"
                      aria-label="Account verwijderen"
                    >
                      <div className="admin-deleteHeader">
                        <strong>Account verwijderen</strong>
                        <button
                          type="button"
                          className="admin-delete-cancel"
                          onClick={() => {
                            setDeleteTarget(null);
                            setDeleteConfirm("");
                            setDeleteError("");
                          }}
                        >
                          Annuleren
                        </button>
                      </div>
                      <p className="admin-deleteText">
                        Type Delete om het account van{" "}
                        <strong>
                          {deleteTarget.naam ?? deleteTarget.email ?? "Onbekend"}
                        </strong>{" "}
                        te verwijderen.
                      </p>
                      <div className="admin-deleteRow">
                        <input
                          type="text"
                          value={deleteConfirm}
                          onChange={(e) => {
                            setDeleteConfirm(e.target.value);
                            if (deleteError) setDeleteError("");
                          }}
                          placeholder="Type Delete"
                        />
                        <button
                          type="button"
                          className="btn btn--danger"
                          onClick={handleDeleteUser}
                          disabled={deleteLoading}
                        >
                          {deleteLoading ? "Bezig..." : "Verwijderen"}
                        </button>
                      </div>
                      {deleteError && (
                        <p className="admin-deleteError" role="alert">
                          {deleteError}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

