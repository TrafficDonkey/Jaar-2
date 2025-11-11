// src/api.js
const API = "http://localhost:5146/api"; // pas aan aan jouw backend

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers
  });

  // als token ongeldig is → uitloggen
  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("gebruikerId");
    window.location.href = "/login";
  }

  return res;
}
