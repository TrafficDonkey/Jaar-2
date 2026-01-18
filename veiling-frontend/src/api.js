// api.js
// Centrale helperfunctie voor API-verzoeken naar de backend.
// Voegt automatisch het JWT-token toe (indien aanwezig) en handelt fouten en 401-status af.

function normalizeApiBase(raw) {
  // In production (Vercel) gebruiken we een same-origin proxy (`/api/*` -> Azure)
  // zodat CORS geen blocker meer is.
  const fallbackOrigin = import.meta.env.PROD
    ? "/api"
    : "http://localhost:5146/api";

  const input = (raw ?? "").toString().trim() || fallbackOrigin;
  const withoutTrailingSlash = input.replace(/\/+$/, "");
  const lower = withoutTrailingSlash.toLowerCase();

  // Sta toe dat VITE_API_BASE zowel een origin is (zonder /api) als een base (met /api)
  return lower.endsWith("/api") ? withoutTrailingSlash : `${withoutTrailingSlash}/api`;
}

const runtimeHostname =
  typeof window !== "undefined" ? window.location.hostname : "";
const useVercelProxy =
  import.meta.env.PROD && runtimeHostname.toLowerCase().endsWith("vercel.app");

// In production op Vercel: forceer de same-origin proxy om CORS issues te vermijden,
// ook als er per ongeluk nog een VITE_API_BASE env var is ingesteld.
export const API_BASE = normalizeApiBase(
  useVercelProxy ? "/api" : import.meta.env.VITE_API_BASE
);
export const API_ORIGIN = API_BASE.replace(/\/api$/i, "");

export default async function apiFetch(path, options = {}) {
  const token = sessionStorage.getItem("token");
  // Bestaande headers uit options meenemen
  const existingHeaders = options.headers ?? {};
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  // Standaard headers + Authorization
  const headers = {
    ...existingHeaders,
    ...(isFormData
      ? {}
      : { "Content-Type": existingHeaders["Content-Type"] || "application/json" }),
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
