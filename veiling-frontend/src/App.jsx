// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginScreen from "./LoginScreen.jsx";
import RegisterScreen from "./RegisterScreen.jsx";
import HomePage from "./HomePage.jsx";
import SettingsPage from "./SettingsPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* start at /login */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/homepage" element={<HomePage />} />
        <Route path="/settings" element={<SettingsPage />} />

        {/* catch-all */}
        <Route path="*" element={<h2 style={{color:"white", padding:"2rem"}}>404 - pagina niet gevonden</h2>} />
      </Routes>
    </BrowserRouter>
  );
}
