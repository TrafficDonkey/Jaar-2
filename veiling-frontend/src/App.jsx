// App.jsx
// Top-level router van de React-app.
// Definieert publieke routes (login/registratie) en beveiligde /app-routes.

import { Routes, Route, Navigate } from "react-router-dom";
import LoginScreen from "./pages/LoginScreen";
import RegisterScreen from "./pages/RegisterScreen";
import Layout from "./Layout";
import ProtectedRoute from "./ProtectedRoute";
import HomePage from "./pages/HomePage";
import SettingsPage from "./pages/SettingsPage";
import AanvoerderPage from "./pages/AanvoerderPage"; // pagina voor aanvoerders

export default function App() {

  return (
    <Routes>
      {/* Standaard: doorsturen naar /login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Publieke routes */}
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/register" element={<RegisterScreen />} />

      {/* Beveiligd gedeelte van de app */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* /app → algemene landing na inloggen (rol-neutraal) */}
        <Route index element={<HomePage />} />

        {/* /app/instellingen → instellingenpagina */}
        <Route path="instellingen" element={<SettingsPage />} />

        {/* /app/aanvoerder → scherm specifiek voor rol 'Aanvoerder' */}
        <Route path="aanvoerder" element={<AanvoerderPage />} />
      </Route>

      {/* Fallback: onbekende URL's gaan terug naar login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
