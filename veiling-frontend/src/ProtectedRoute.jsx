// ProtectedRoute.jsx
// Beschermde routecomponent die controleert of een gebruiker is ingelogd.
// Indien geen geldig token aanwezig is, wordt automatisch doorgestuurd naar /login.

import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token"); // JWT-token uit localStorage
  const location = useLocation();              // huidige route (voor redirect terug)

  // ────────────────────────────── AUTHENTICATIECHECK ──────────────────────────────
  // Als er geen token is, ga naar loginpagina en onthoud waarvandaan gebruiker kwam
  if (!token) 
    return <Navigate to="/login" replace state={{ from: location }} />;

  // Toegang toegestaan: toon de beveiligde inhoud
  return children;
}
