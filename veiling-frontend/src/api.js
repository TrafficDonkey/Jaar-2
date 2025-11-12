// api.js
// Centrale helperfunctie voor API-verzoeken naar de backend.
// Voegt automatisch het JWT-token toe (indien aanwezig) en handelt fouten en 401-status af.

export default async function apiFetch(path, options = {}) {
  const API = import.meta.env.VITE_API_BASE ?? "http://localhost:5146/api"; // Basis-URL van de API (uit .env of lokaal)
  const token = localStorage.getItem("token");

  // ────────────────────────────── HEADERS ──────────────────────────────
  // Voeg standaard headers toe + Authorization indien ingelogd
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  // ────────────────────────────── FETCH ──────────────────────────────
  // Voer het verzoek uit en vang fouten netjes op
  const res = await fetch(`${API}${path}`, { headers, ...options });

  // Controleer of het antwoord geldig is
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }

  // ────────────────────────────── AUTHENTICATIE ──────────────────────────────
  // Als token ongeldig is, verwijder lokale data en stuur gebruiker terug naar login
  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("gebruikerId");
    window.location.href = "/login";
  }

  // ────────────────────────────── RESULTAAT ──────────────────────────────
  // Retourneer JSON-data of null (bij lege respons)
  return res.status === 204 ? null : res.json();
}
