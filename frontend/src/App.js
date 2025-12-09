import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "sonner";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Apps from "./pages/Apps";
import AppDetails from "./pages/AppDetails";
import Streams from "./pages/Streams";
import StreamDetails from "./pages/StreamDetails";
import Webhooks from "./pages/Webhooks";
import Analytics from "./pages/Analytics";
import Player from "./pages/Player";
import Branding from "./pages/Branding";

// Components
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected routes with dashboard layout */}
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="apps" element={<Apps />} />
              <Route path="apps/:appId" element={<AppDetails />} />
              <Route path="streams" element={<Streams />} />
              <Route path="streams/:id" element={<StreamDetails />} />
              <Route path="webhooks" element={<Webhooks />} />
              <Route path="webhooks/:appId" element={<Webhooks />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="analytics/:appId" element={<Analytics />} />
              <Route path="player/:id" element={<Player />} />
              <Route path="branding/:appId" element={<Branding />} />
            </Route>
            
            {/* Catch all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" />
      </div>
    </AuthProvider>
  );
}

export default App;
