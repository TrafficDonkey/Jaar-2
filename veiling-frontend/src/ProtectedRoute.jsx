// ProtectedRoute.jsx
// Beschermde routecomponent die:
// - controleert of een gebruiker is ingelogd (JWT in sessionStorage)
// - optioneel controleert op rol (allowedRoles / requireRole)

import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRoles, requireRole }) {
  const token = sessionStorage.getItem("token");
  const role = sessionStorage.getItem("role") || "";
  const location = useLocation();

  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;

  if (requireRole && role !== requireRole) {
    return <Navigate to="/app" replace />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (!allowedRoles.includes(role)) {
      return <Navigate to="/app" replace />;
    }
  }

  return children;
}
