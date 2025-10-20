import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  MessageSquare, 
  Users, 
  FileText, 
  Bot, 
  Settings, 
  Zap,
  Menu,
  X,
  Sun,
  Moon,
  Flame,
  LogOut,
  Clock,
  Tag,
  Layout,
  Image,
  UserCircle2
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useApp } from '../contexts/AppContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Layout },
    { name: 'Inbox', href: '/inbox', icon: MessageSquare },
    { name: 'Contactos', href: '/contacts', icon: Users },
    { name: 'Usuarios', href: '/users', icon: UserCircle2 },
    { name: 'Programación', href: '/scheduled', icon: Clock },
    { name: 'Documentos', href: '/documents', icon: FileText },
    { name: 'Asistentes', href: '/assistants', icon: Bot },
    { name: 'Plantillas', href: '/templates', icon: FileText },
    { name: 'Etiquetas', href: '/tags', icon: Tag },
    { name: 'Multimedia', href: '/media', icon: Image },
    { name: 'Integraciones', href: '/integrations', icon: Zap },
    { name: 'Configuración', href: '/config', icon: Settings },
  ];

  const handleNavigation = (href: string) => {
    navigate(href);
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-bg dark:via-dark-surface dark:to-dark-card">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-dark-border/50 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-dark-border/50 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                FLAME
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-2 rounded-xl bg-white/50 dark:bg-dark-surface/50 backdrop-blur-sm border border-gray-200/50 dark:border-dark-border/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation - Scrollable */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 border-2 border-purple-500/50 text-purple-600 dark:text-purple-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-dark-surface/50 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </button>
              );
            })}
          </nav>

          {/* User info and actions - Fixed at bottom */}
          <div className="p-4 border-t border-gray-200/50 dark:border-dark-border/50 space-y-3 flex-shrink-0">
            {/* User info */}
            {user && (
              <div className="flex items-center space-x-3 px-4 py-3 rounded-2xl bg-white/50 dark:bg-dark-surface/50 backdrop-blur-sm border border-gray-200/50 dark:border-dark-border/50">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            )}

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-2xl bg-white/50 dark:bg-dark-surface/50 backdrop-blur-sm border border-gray-200/50 dark:border-dark-border/50 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
              <span className="font-medium">
                {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
              </span>
            </button>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-2xl bg-red-50 dark:bg-red-900/20 backdrop-blur-sm border border-red-200/50 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:ml-64">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-border/50">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl bg-white/50 dark:bg-dark-surface/50 backdrop-blur-sm border border-gray-200/50 dark:border-dark-border/50"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              FLAME
            </span>
          </div>
        </div>

        {/* Page content */}
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
};
