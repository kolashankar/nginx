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
              <Route path="streams" element={<div className="text-center py-12 text-gray-600">Streams page coming soon</div>} />
              <Route path="api-keys" element={<div className="text-center py-12 text-gray-600">API Keys page coming soon</div>} />
              <Route path="webhooks" element={<div className="text-center py-12 text-gray-600">Webhooks page coming soon</div>} />
              <Route path="analytics" element={<div className="text-center py-12 text-gray-600">Analytics page coming soon</div>} />
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
