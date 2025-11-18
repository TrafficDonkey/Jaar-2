// src/main.jsx
// App-entry: initialiseert het thema vóór de eerste render en mount de router.

import { createRoot } from "react-dom/client";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// ────────────────────────────── Theme init ──────────────────────────────
// Zet <html>.dark vóór de eerste render om flash en vergeten dark mode te voorkomen.
const savedTheme = localStorage.getItem("theme");          // "dark" | "light" | null
const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
const initialTheme = savedTheme ?? (prefersDark ? "dark" : "light");
document.documentElement.classList.toggle("dark", initialTheme === "dark");

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
