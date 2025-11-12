// main.jsx
// Instappunt van de React-applicatie.
// Maakt de root-rendering aan, voegt routing toe en laadt globale stijlen.

import { createRoot } from "react-dom/client";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// ────────────────────────────── APP-INITIALISATIE ──────────────────────────────
// Mount de <App /> component in het #root-element binnen BrowserRouter
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
