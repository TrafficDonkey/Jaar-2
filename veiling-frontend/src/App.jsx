// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginScreen from "./LoginScreen.jsx";
import RegisterScreen from "./RegisterScreen.jsx";
import HomePage from "./HomePage.jsx";
import SettingsPage from "./SettingsPage.jsx";
import ProtectedRoute from "./ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* start at /login */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/homepage" element={<ProtectedRoute><HomePage /></ProtectedRoute >} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute >} />

        {/* catch-all */}
        <Route path="*" element={<h2 style={{color:"white", padding:"2rem"}}>404 - pagina niet gevonden</h2>} />
      </Routes>
    </BrowserRouter>
  );
}
