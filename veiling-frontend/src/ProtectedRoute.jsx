// src/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  if (!token) {
    // not logged in → go to login
    return <Navigate to="/login" replace />;
  }
  return children;
}
