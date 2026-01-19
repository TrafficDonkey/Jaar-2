// api.js
// Centrale helperfunctie voor API-verzoeken naar de backend.
// - Leest VITE_API_BASE uit `.env`
// - Voegt Authorization header toe (JWT uit sessionStorage)
// - Normaliseert fouten naar bruikbare Error messages voor de UI

export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:5146/api";

export default async function apiFetch(path, options = {}) {
  // Auth: token wordt bij login opgeslagen in sessionStorage en hier automatisch meegestuurd.
  const token = sessionStorage.getItem("token");

  // Bestaande headers uit options meenemen.
  const existingHeaders = options.headers ?? {};

  // FormData mag geen handmatige Content-Type krijgen; de browser zet dan boundary + multipart correct.
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  // Standaard headers + Authorization.
  const headers = {
    ...existingHeaders,
    ...(isFormData
      ? {}
      : {
          "Content-Type":
            existingHeaders["Content-Type"] || "application/json",
        }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const fetchOptions = {
    ...options,
    headers,
    // Als je ooit cookies gaat gebruiken kun je deze laten staan:
    // credentials: "include",
  };

  // Netwerkrequest: frontend -> backend API (VITE_API_BASE).
  const res = await fetch(`${API_BASE}${path}`, fetchOptions);

  // 401 = niet ingelogd / token verlopen: client-side sessie opruimen en terug naar login.
  if (res.status === 401) {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("gebruikerId");
    window.location.href = "/login";
    throw new Error("Niet ingelogd of sessie verlopen");
  }

  // Andere fouten netjes doorgeven.
  if (!res.ok) {
    // Probeer backend-json errors te lezen (maar val terug op text).
    const contentType = res.headers.get("Content-Type") || "";
    const text = await res.text();
    const trimmed = text.trim();
    let message = text;

    if (
      trimmed &&
      (contentType.includes("application/json") || trimmed.startsWith("{"))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        message =
          parsed?.message ||
          parsed?.Message ||
          parsed?.title ||
          parsed?.detail ||
          parsed?.error ||
          text;
      } catch {
        message = text;
      }
    }

    const err = new Error(message || `${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }

  // 204 No Content.
  if (res.status === 204) {
    return null;
  }

  // Probeer JSON te parsen, val anders terug op text.
  const contentType = res.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }

  return res.text();
}

