// App.jsx
// Hoofdrouting van de React-applicatie.
// Bepaalt welke pagina's openbaar zijn (login/registratie) en welke beschermd zijn via ProtectedRoute.

import { Routes, Route, Navigate } from "react-router-dom";
import LoginScreen from "./pages/LoginScreen";
import RegisterScreen from "./pages/RegisterScreen";
import Layout from "./Layout";
import ProtectedRoute from "./ProtectedRoute";
import HomePage from "./pages/HomePage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      {/* ────────────────────────────── ROOT ────────────────────────────── */}
      {/* Redirect de hoofdpagina automatisch naar /login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* ────────────────────────────── OPENBARE PAGINA'S ────────────────────────────── */}
      {/* Login- en registratieschermen zijn publiek toegankelijk */}
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/register" element={<RegisterScreen />} />

      {/* ────────────────────────────── BESCHERMDE PAGINA'S ────────────────────────────── */}
      {/* Alle routes binnen /app vereisen authenticatie via ProtectedRoute */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Standaard startpagina binnen de app */}
        <Route index element={<HomePage />} /> {/* /app */}

        {/* Instellingenpagina binnen de app */}
        <Route path="instellingen" element={<SettingsPage />} /> {/* /app/instellingen */}
      </Route>

      {/* ────────────────────────────── FOUT/ONGELDIGE ROUTE ────────────────────────────── */}
      {/* Onbekende routes leiden terug naar login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
