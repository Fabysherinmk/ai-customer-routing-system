import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { RequestDetails } from './pages/RequestDetails';
import { UsersList } from './pages/UsersList';

// Simple Protected Route helper component for general authenticated portal access
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('crrs_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <DashboardLayout>{children}</DashboardLayout>;
};

// Strict Admin-only Protected Route helper component
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('crrs_token');
  const userJson = localStorage.getItem('crrs_user');
  const user = userJson ? JSON.parse(userJson) : null;

  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  return <DashboardLayout>{children}</DashboardLayout>;
};

function App() {
  return (
    <Router>
      <SocketProvider>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Portal Routes */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/requests/:id" 
            element={
              <ProtectedRoute>
                <RequestDetails />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/users" 
            element={
              <AdminRoute>
                <UsersList />
              </AdminRoute>
            } 
          />

          {/* Fallback redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SocketProvider>
    </Router>
  );
}

export default App;
