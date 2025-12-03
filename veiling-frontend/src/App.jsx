// src/App.jsx
// Router voor de hele frontend.
// - "/"  : publieke landingspagina
// - "/login" / "/register": inloggen & registreren
// - "/app/*": ingelogde omgeving met layout + navbar
//   - "/app"            : dashboard/landing voor ingelogde gebruikers
//   - "/app/instellingen": instellingen
//   - "/app/aanvoerder" : scherm voor rol 'Aanvoerder'
//   - "/app/admin"      : beheerpagina voor rol 'Admin'

import { Routes, Route, Navigate } from "react-router-dom";
import LoginScreen from "./pages/LoginScreen";
import RegisterScreen from "./pages/RegisterScreen";
import Layout from "./Layout";
import ProtectedRoute from "./ProtectedRoute";
import HomePage from "./pages/HomePage";
import SettingsPage from "./pages/SettingsPage";
import KoperPage from "./pages/KoperPage";
import AanvoerderPage from "./pages/AanvoerderPage";
import VeilingmeesterPage from "./pages/VeilingMeesterPage";
import AdminPage from "./pages/AdminPage";

export default function App() {
  return (
    <Routes>
      {/* Publieke landingspagina */}
      <Route path="/" element={<HomePage />} />

      {/* Publieke auth-pagina's */}
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/register" element={<RegisterScreen />} />

      {/* Ingelogde omgeving met navbar/layout */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* /app → eenvoudige dashboard/landing voor ingelogde user */}
        <Route index element={<HomePage />} />

        {/* /app/instellingen */}
        <Route path="instellingen" element={<SettingsPage />} />

        <Route 
          path="koper" 
          element={
            <ProtectedRoute allowedRoles={["Klant", "Admin"]}>
              <KoperPage />
            </ProtectedRoute>
        } />


        <Route
          path="veilingmeester"
          element={
            <ProtectedRoute allowedRoles={["Veilingmeester", "Admin"]}>
                <VeilingmeesterPage />
            </ProtectedRoute>
          }
        />

        {/* /app/aanvoerder alleen voor rol Aanvoerder */}
        <Route
          path="aanvoerder"
          element={
            <ProtectedRoute allowedRoles={["Aanvoerder", "Admin"]}>
              <AanvoerderPage />
            </ProtectedRoute>
          }
        />

        {/* /app/admin alleen voor rol Admin */}
        <Route
          path="admin"
          element={
            <ProtectedRoute requireRole="Admin">
              <AdminPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Onbekende routes → terug naar landingspagina */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
