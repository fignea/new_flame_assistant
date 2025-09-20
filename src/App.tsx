import React from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppProvider, useApp } from './contexts/AppContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import LandingPage from './pages/LandingPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { InboxPage } from './pages/inbox/InboxPage';
import { ContactsPage } from './pages/contacts/ContactsPage';
import { DocumentsPage } from './pages/documents/DocumentsPage';
import { AssistantsPage } from './pages/assistants/AssistantsPage';
import { IntegrationsPage } from './pages/integrations/IntegrationsPage';
import { SettingsPage } from './pages/settings/SettingsPage';

const AppContent: React.FC = () => {
  const { currentPage } = useApp();

  const renderPage = () => {
    switch (currentPage) {
      case 'landing':
        return <LandingPage />;
      case 'dashboard':
        return (
          <DashboardLayout>
            <DashboardPage />
          </DashboardLayout>
        );
      case 'inbox':
        return (
          <DashboardLayout>
            <InboxPage />
          </DashboardLayout>
        );
      case 'contacts':
        return (
          <DashboardLayout>
            <ContactsPage />
          </DashboardLayout>
        );
      case 'documents':
        return (
          <DashboardLayout>
            <DocumentsPage />
          </DashboardLayout>
        );
      case 'assistants':
        return (
          <DashboardLayout>
            <AssistantsPage />
          </DashboardLayout>
        );
      case 'integrations':
        return (
          <DashboardLayout>
            <IntegrationsPage />
          </DashboardLayout>
        );
      case 'settings':
        return (
          <DashboardLayout>
            <SettingsPage />
          </DashboardLayout>
        );
      default:
        return <LandingPage />;
    }
  };

  return (
    <div className="App min-h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 transition-colors">
      {renderPage()}
    </div>
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
