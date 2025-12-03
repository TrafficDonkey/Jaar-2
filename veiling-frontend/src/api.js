// api.js
// Centrale helperfunctie voor API-verzoeken naar de backend.
// Voegt automatisch het JWT-token toe (indien aanwezig) en handelt fouten en 401-status af.

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:5146/api";

export default async function apiFetch(path, options = {}) {
  const token = sessionStorage.getItem("token");

  // Bestaande headers uit options meenemen
  const existingHeaders = options.headers ?? {};

  // Standaard headers + Authorization
  const headers = {
    ...existingHeaders,
    "Content-Type": existingHeaders["Content-Type"] || "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const fetchOptions = {
    ...options,
    headers,
    // als je ooit cookies gaat gebruiken kun je deze laten staan:
    // credentials: "include",
  };

  const res = await fetch(`${API_BASE}${path}`, fetchOptions);

  // Eerst 401 checken → user uitloggen
  if (res.status === 401) {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("gebruikerId");
    // Globale redirect naar login
    window.location.href = "/login";
    throw new Error("Niet ingelogd of sessie verlopen");
  }

  // Andere fouten netjes doorgeven
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }

  // Geen content
  if (res.status === 204) {
    return null;
  }

  // Probeer JSON te parsen, val anders terug op text
  const contentType = res.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }

  return res.text();
}
