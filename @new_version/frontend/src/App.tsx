import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppProvider, useApp } from './contexts/AppContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import LandingPage from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { InboxPage } from './pages/inbox/InboxPage';
import { ContactsPage } from './pages/contacts/ContactsPage';
import { DocumentsPage } from './pages/documents/DocumentsPage';
import { AssistantsPage } from './pages/assistants/AssistantsPage';
import { IntegrationsPage } from './pages/integrations/IntegrationsPage';
import { ConfigPage } from './pages/config/ConfigPage';

// Componente para rutas protegidas
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useApp();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Componente para rutas públicas (solo accesibles si no estás logueado)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useApp();
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  return (
    <Router>
      <div className="App min-h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 transition-colors">
        <Routes>
          {/* Rutas públicas */}
          <Route path="/" element={<LandingPage />} />
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            } 
          />
          
          {/* Rutas protegidas */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DashboardPage />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/inbox" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <InboxPage />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/contacts" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ContactsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/documents" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DocumentsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/assistants" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AssistantsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/integrations" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <IntegrationsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/config" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ConfigPage />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          
          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
