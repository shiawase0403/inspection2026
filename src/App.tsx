/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { InspectorDashboard } from './pages/InspectorDashboard';
import { InspectorTask } from './pages/InspectorTask';
import { PublicQuery } from './pages/PublicQuery';
import { Layout } from './components/Layout';

const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole?: string }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && user.role !== allowedRole) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/inspector" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/query" element={<PublicQuery />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRole="admin">
              <Layout title="Admin Dashboard"><AdminDashboard /></Layout>
            </ProtectedRoute>
          } />
          
          {/* Inspector Routes */}
          <Route path="/inspector" element={
            <ProtectedRoute>
              <Layout title="Inspector Dashboard"><InspectorDashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/inspector/task/:taskId" element={
            <ProtectedRoute>
              <Layout title="Inspection"><InspectorTask /></Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

