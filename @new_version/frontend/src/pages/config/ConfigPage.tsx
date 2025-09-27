import React, { useState, useEffect } from 'react';
import { Settings, User, Bell, Shield, Database, Palette, Globe, Key, RefreshCw } from 'lucide-react';
import { apiService } from '../../services/api.service';

export const ConfigPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    created_at: ''
  });
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [databaseStatus, setDatabaseStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Cargar datos del perfil
  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await apiService.getProfile();
      if (response.success && response.data) {
        setProfile(response.data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar información del sistema
  const loadSystemInfo = async () => {
    try {
      const response = await apiService.get('/api/config/system-info');
      if (response.success && response.data) {
        setSystemInfo(response.data);
      }
    } catch (error) {
      console.error('Error loading system info:', error);
    }
  };

  // Cargar estado de la base de datos
  const loadDatabaseStatus = async () => {
    try {
      const response = await apiService.get('/api/config/database-status');
      if (response.success && response.data) {
        setDatabaseStatus(response.data);
      }
    } catch (error) {
      console.error('Error loading database status:', error);
    }
  };

  useEffect(() => {
    loadProfile();
    loadSystemInfo();
    loadDatabaseStatus();
  }, []);

  const tabs = [
    { id: 'profile', name: 'Perfil', icon: User },
    { id: 'notifications', name: 'Notificaciones', icon: Bell },
    { id: 'security', name: 'Seguridad', icon: Shield },
    { id: 'database', name: 'Base de Datos', icon: Database },
    { id: 'system', name: 'Sistema', icon: Settings },
    { id: 'appearance', name: 'Apariencia', icon: Palette },
    { id: 'integrations', name: 'Integraciones', icon: Globe },
    { id: 'api', name: 'API Keys', icon: Key },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Información Personal</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Actualiza tu información personal y preferencias.</p>
            </div>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({...profile, name: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({...profile, email: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rol</label>
                <select className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500">
                  <option>Administrador</option>
                  <option>Usuario</option>
                  <option>Moderador</option>
                </select>
              </div>
            </div>
          </div>
        );
      
      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Configuración de Notificaciones</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Personaliza cómo y cuándo recibir notificaciones.</p>
            </div>
            <div className="space-y-4">
              {[
                { name: 'Nuevas conversaciones', description: 'Recibir notificaciones cuando lleguen nuevos mensajes' },
                { name: 'Menciones', description: 'Notificaciones cuando te mencionen en conversaciones' },
                { name: 'Sistema', description: 'Actualizaciones del sistema y mantenimiento' },
                { name: 'Email', description: 'Recibir notificaciones por correo electrónico' },
              ].map((item) => (
                <div key={item.name} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Configuración de Seguridad</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gestiona la seguridad de tu cuenta.</p>
            </div>
            <div className="space-y-4">
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Cambiar Contraseña</h4>
                <div className="space-y-3">
                  <input
                    type="password"
                    placeholder="Contraseña actual"
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <input
                    type="password"
                    placeholder="Nueva contraseña"
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <input
                    type="password"
                    placeholder="Confirmar nueva contraseña"
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <button className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Actualizar Contraseña
                </button>
              </div>
            </div>
          </div>
        );
      
      case 'database':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Configuración de Base de Datos</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gestiona la conexión y configuración de la base de datos.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Estado de Conexión</h4>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${databaseStatus?.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {databaseStatus?.connected ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>
              </div>
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Tipo de Base de Datos</h4>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {databaseStatus?.type || 'PostgreSQL'} {databaseStatus?.version || '15'}
                </span>
              </div>
            </div>
          </div>
        );
      
      case 'system':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Información del Sistema</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Estadísticas y estado del sistema.</p>
            </div>
            {systemInfo ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Usuarios Totales</h4>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{systemInfo.totalUsers}</span>
                </div>
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Contactos</h4>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">{systemInfo.totalContacts}</span>
                </div>
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Mensajes</h4>
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{systemInfo.totalMessages}</span>
                </div>
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Programación</h4>
                  <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">{systemInfo.totalScheduledMessages}</span>
                </div>
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Asistentes</h4>
                  <span className="text-2xl font-bold text-pink-600 dark:text-pink-400">{systemInfo.totalAssistants}</span>
                </div>
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Tiempo de Actividad</h4>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {Math.floor(systemInfo.systemUptime / 3600)}h {Math.floor((systemInfo.systemUptime % 3600) / 60)}m
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-spin" />
                <p className="text-gray-500 dark:text-gray-400">Cargando información del sistema...</p>
              </div>
            )}
          </div>
        );
      
      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Apariencia</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Personaliza la apariencia de la aplicación.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tema</label>
                <select className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500">
                  <option>Sistema</option>
                  <option>Claro</option>
                  <option>Oscuro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Idioma</label>
                <select className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500">
                  <option>Español</option>
                  <option>English</option>
                  <option>Português</option>
                </select>
              </div>
            </div>
          </div>
        );
      
      case 'integrations':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Integraciones</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gestiona las integraciones con servicios externos.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['WhatsApp', 'Facebook', 'Instagram', 'Telegram'].map((service) => (
                <div key={service} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">{service}</h4>
                    <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Configurar integración con {service}</p>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'api':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">API Keys</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gestiona las claves de API para integraciones.</p>
            </div>
            <div className="space-y-4">
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">OpenAI API Key</h4>
                <input
                  type="password"
                  placeholder="sk-..."
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">JWT Secret</h4>
                <input
                  type="password"
                  placeholder="your-jwt-secret"
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-bg dark:via-dark-surface dark:to-dark-card">
      {/* Header */}
      <div className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-border/50 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            Configuración
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestiona la configuración de tu cuenta y la aplicación.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="bg-white dark:bg-zinc-800 shadow rounded-lg p-6">
            {renderTabContent()}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
