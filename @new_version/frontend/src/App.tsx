import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppProvider, useApp } from './contexts/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotificationProvider } from './components/NotificationSystem';
import { useWhatsAppNotifications } from './hooks/useWhatsAppNotifications';
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
import { ScheduledMessagesPage } from './pages/scheduled/ScheduledMessagesPage';
import { WidgetDemoPage } from './pages/web-chat/WidgetDemoPage';

// Componente para manejar notificaciones de WhatsApp
const WhatsAppNotificationHandler: React.FC = () => {
  useWhatsAppNotifications();
  return null;
};

// Componente para rutas protegidas
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useApp();
  
  // Mostrar loading mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <>
      <WhatsAppNotificationHandler />
      {children}
    </>
  );
};

// Componente para rutas públicas (solo accesibles si no estás logueado)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useApp();
  
  // Mostrar loading mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }
  
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
            path="/web-chat/demo"
            element={
              <ProtectedRoute>
                <WidgetDemoPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/scheduled"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ScheduledMessagesPage />
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
    <ErrorBoundary>
      <ThemeProvider>
        <AppProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
