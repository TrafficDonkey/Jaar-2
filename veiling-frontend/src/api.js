export default async function apiFetch(path, options = {}) {
  const API = import.meta.env.VITE_API_BASE ?? "http://localhost:5146/api";
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const res = await fetch(`${API}${path}`, { headers, ...options });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }

  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("gebruikerId");
    window.location.href = "/login";
  }

  return res.status === 204 ? null : res.json();
}
