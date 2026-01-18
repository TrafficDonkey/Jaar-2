// ProtectedRoute.jsx
// Beschermde routecomponent die:
// 1) controleert of een gebruiker is ingelogd (JWT in sessionStorage)
// 2) optioneel controleert op rol (allowedRoles / requireRole)
//
// Dit maakt navigatie "foutloos": een gebruiker kan nooit per ongeluk een pagina openen
// waarvoor hij/zij geen rechten heeft (ook niet via een directe URL).

import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRoles, requireRole }) {
  // "token" bepaalt of iemand ingelogd is.
  const token = sessionStorage.getItem("token");

  // "role" bepaalt welke schermen iemand mag zien.
  const role = sessionStorage.getItem("role") || "";

  // Locatie gebruiken we om de gebruiker na login terug te sturen naar de oorspronkelijke pagina.
  const location = useLocation();

  // 1) Niet ingelogd: altijd terug naar /login.
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;

  // 2) Ingelogd maar geen juiste rol: terug naar de veilige startpagina (/app).
  // "requireRole" is een striktere variant voor 1 specifieke rol.
  if (requireRole && role !== requireRole) {
    return <Navigate to="/app" replace />;
  }

  // "allowedRoles" is de algemene variant: lijst met rollen die toegang hebben.
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (!allowedRoles.includes(role)) {
      return <Navigate to="/app" replace />;
    }
  }

  // 3) Toegang toegestaan: toon de beveiligde inhoud (page component).
  return children;
}

