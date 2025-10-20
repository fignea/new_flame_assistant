import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Database, 
  Palette, 
  Globe, 
  Key, 
  RefreshCw,
  Building2,
  Users,
  MessageSquare,
  Bot,
  FileText,
  Tag,
  Image,
  Calendar,
  Server,
  HardDrive,
  Cpu,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
  Loader2
} from 'lucide-react';
import { apiService } from '../../services/api.service';
import { useApp } from '../../contexts/AppContext';
import { useNotificationHelpers } from '../../components/NotificationSystem';

export const ConfigPage: React.FC = () => {
  const { user, tenant } = useApp();
  const { showSuccess, showError } = useNotificationHelpers();
  const [activeTab, setActiveTab] = useState('profile');
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [databaseStatus, setDatabaseStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [populatingDemo, setPopulatingDemo] = useState(false);
  
  // Estados del formulario de perfil
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: ''
  });
  
  // Estados del formulario de cambio de contraseña
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Cargar información del sistema
  const loadSystemInfo = async () => {
    try {
      const response = await apiService.getSystemInfo();
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
      const response = await apiService.getDatabaseStatus();
      if (response.success && response.data) {
        setDatabaseStatus(response.data);
      }
    } catch (error) {
      console.error('Error loading database status:', error);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || ''
      });
    }
    loadSystemInfo();
    loadDatabaseStatus();
  }, [user]);

  // Guardar cambios del perfil
  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      const response = await apiService.updateProfile(profileForm);
      if (response.success) {
        showSuccess('Perfil actualizado', 'Los cambios se han guardado exitosamente');
      } else {
        showError('Error', response.message || 'No se pudo actualizar el perfil');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      showError('Error', 'No se pudo actualizar el perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  // Cambiar contraseña
  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError('Error', 'Las contraseñas no coinciden');
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      showError('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setChangingPassword(true);
      const response = await apiService.post('/api/config/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      
      if (response.success) {
        showSuccess('Contraseña actualizada', 'Tu contraseña ha sido cambiada exitosamente');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        showError('Error', response.message || 'No se pudo cambiar la contraseña');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      showError('Error', 'No se pudo cambiar la contraseña');
    } finally {
      setChangingPassword(false);
    }
  };

  // Refrescar datos
  const handleRefresh = () => {
    loadSystemInfo();
    loadDatabaseStatus();
  };

  // Función para poblar datos de demo
  const handlePopulateDemoData = async () => {
    if (!confirm('¿Estás seguro de que quieres poblar la base de datos con datos de demostración? Esto agregará contactos, conversaciones y mensajes de ejemplo.')) {
      return;
    }

    try {
      setPopulatingDemo(true);
      const response = await apiService.post('/api/config/populate-demo-data', {});
      if (response.success) {
        showSuccess('Datos poblados', 'Los datos de demostración se han agregado exitosamente');
        loadSystemInfo();
        loadDatabaseStatus();
      } else {
        showError('Error', response.message || 'No se pudieron poblar los datos de demo');
      }
    } catch (error) {
      console.error('Error populating demo data:', error);
      showError('Error', 'No se pudieron poblar los datos de demo');
    } finally {
      setPopulatingDemo(false);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Perfil', icon: User },
    { id: 'tenant', name: 'Organización', icon: Building2 },
    { id: 'security', name: 'Seguridad', icon: Shield },
    { id: 'database', name: 'Base de Datos', icon: Database },
    { id: 'system', name: 'Sistema', icon: Settings },
  ];
  
  // Agregar tab de Demo solo para tenant flame
  if (tenant?.slug === 'flame') {
    tabs.push({ id: 'demo', name: 'Demo Data', icon: Activity });
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Información Personal</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Actualiza tu información personal y preferencias</p>
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 disabled:opacity-50"
              >
                {savingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nombre</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white"
                  placeholder="Tu nombre"
                />
              </div>

              <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white"
                  placeholder="tu@email.com"
                />
              </div>

              <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rol</label>
                <input
                  type="text"
                  value={user?.role || 'N/A'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                />
              </div>

              <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ID de Usuario</label>
                <input
                  type="text"
                  value={user?.id || 'N/A'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        );

      case 'tenant':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Información de la Organización</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Detalles de tu organización y límites del plan</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border">
                <div className="flex items-center space-x-3 mb-4">
                  <Building2 className="w-5 h-5 text-purple-500" />
                  <h4 className="font-medium text-gray-900 dark:text-white">Nombre</h4>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{tenant?.name || 'N/A'}</p>
              </div>

              <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border">
                <div className="flex items-center space-x-3 mb-4">
                  <Key className="w-5 h-5 text-blue-500" />
                  <h4 className="font-medium text-gray-900 dark:text-white">Slug</h4>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{tenant?.slug || 'N/A'}</p>
              </div>

              <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border">
                <div className="flex items-center space-x-3 mb-4">
                  <Activity className="w-5 h-5 text-green-500" />
                  <h4 className="font-medium text-gray-900 dark:text-white">Plan</h4>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">{tenant?.plan_type || 'N/A'}</p>
              </div>

              <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border">
                <div className="flex items-center space-x-3 mb-4">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <h4 className="font-medium text-gray-900 dark:text-white">Estado</h4>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">{tenant?.status || 'N/A'}</p>
              </div>
            </div>

            {/* Límites del Plan */}
            {tenant?.limits && (
              <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border">
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">Límites del Plan</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Usuarios Máximos</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{tenant.limits.max_users || 'Ilimitado'}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Contactos Máximos</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{tenant.limits.max_contacts || 'Ilimitado'}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Conversaciones Máximas</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{tenant.limits.max_conversations || 'Ilimitado'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Estadísticas de Uso */}
            {systemInfo?.tenant && (
              <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">Uso Actual</h4>
                  <button
                    onClick={handleRefresh}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <Users className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{systemInfo.tenant.totalUsers}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Usuarios</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <User className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{systemInfo.tenant.totalContacts}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Contactos</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <MessageSquare className="w-6 h-6 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{systemInfo.tenant.totalConversations}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Conversaciones</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <MessageSquare className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{systemInfo.tenant.totalMessages}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Mensajes</div>
                  </div>
                  <div className="text-center p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                    <Calendar className="w-6 h-6 text-pink-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{systemInfo.tenant.totalScheduledMessages}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Programados</div>
                  </div>
                  <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                    <Bot className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{systemInfo.tenant.totalAssistants}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Asistentes</div>
                  </div>
                  <div className="text-center p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                    <FileText className="w-6 h-6 text-cyan-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{systemInfo.tenant.totalTemplates}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Plantillas</div>
                  </div>
                  <div className="text-center p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                    <Tag className="w-6 h-6 text-teal-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{systemInfo.tenant.totalTags}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Etiquetas</div>
                  </div>
                  <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <Image className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{systemInfo.tenant.totalMediaFiles}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Archivos</div>
                  </div>
                </div>
              </div>
            )}

            {/* Información de Usuario */}
            <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border">
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">Detalles de la Cuenta</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">ID de Usuario</span>
                  <span className="text-sm font-mono text-gray-900 dark:text-white">{user?.id?.substring(0, 8)}...</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Rol</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">{user?.role || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Cuenta Creada</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('es-ES') : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'tenant':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Información de la Organización</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Detalles de tu organización y configuración</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nombre de la Organización</label>
                <input
                  type="text"
                  value={tenant?.name || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Slug</label>
                <input
                  type="text"
                  value={tenant?.slug || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Plan</label>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 rounded-full text-sm font-medium capitalize">
                    {tenant?.plan_type || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Estado</label>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                    tenant?.status === 'active' 
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                      : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                  }`}>
                    {tenant?.status || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ID de Organización</label>
                <input
                  type="text"
                  value={tenant?.id || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-xs"
                />
              </div>
            </div>
          </div>
        );
      
      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Configuración de Seguridad</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gestiona la seguridad de tu cuenta</p>
            </div>

            <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Cambiar Contraseña</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contraseña Actual
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white"
                    placeholder="Tu contraseña actual"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white"
                    placeholder="Repite la nueva contraseña"
                  />
                </div>
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 disabled:opacity-50 flex items-center space-x-2"
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Actualizando...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      <span>Actualizar Contraseña</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      
      case 'database':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Estado de la Base de Datos</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Información sobre la conexión y estado de la base de datos</p>
              </div>
              <button
                onClick={handleRefresh}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Actualizar</span>
              </button>
            </div>

            {databaseStatus && (
              <>
                {/* Estado de Conexión */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border">
                    <div className="flex items-center space-x-3 mb-2">
                      {databaseStatus.connected ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <h4 className="font-medium text-gray-900 dark:text-white">Estado</h4>
                    </div>
                    <p className={`text-lg font-bold ${databaseStatus.connected ? 'text-green-600' : 'text-red-600'}`}>
                      {databaseStatus.connected ? 'Conectado' : 'Desconectado'}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border">
                    <div className="flex items-center space-x-3 mb-2">
                      <Database className="w-5 h-5 text-blue-500" />
                      <h4 className="font-medium text-gray-900 dark:text-white">Tipo</h4>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {databaseStatus.type} {databaseStatus.version}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border">
                    <div className="flex items-center space-x-3 mb-2">
                      <HardDrive className="w-5 h-5 text-purple-500" />
                      <h4 className="font-medium text-gray-900 dark:text-white">Tamaño</h4>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{databaseStatus.size}</p>
                  </div>
                </div>

                {/* Conexiones Activas */}
                <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border">
                  <div className="flex items-center space-x-3 mb-4">
                    <Activity className="w-5 h-5 text-green-500" />
                    <h4 className="font-medium text-gray-900 dark:text-white">Conexiones Activas</h4>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{databaseStatus.activeConnections}</p>
                </div>

                {/* Top 10 Tablas por Tamaño */}
                {databaseStatus.tables && databaseStatus.tables.length > 0 && (
                  <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">Tablas Principales (Top 10 por tamaño)</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead>
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Tabla
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Schema
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Tamaño
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {databaseStatus.tables.map((table: any, index: number) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                {table.tablename}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                {table.schemaname}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                {table.size}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      
      case 'system':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Información del Sistema</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Estadísticas y estado del servidor</p>
              </div>
              <button
                onClick={handleRefresh}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Actualizar</span>
              </button>
            </div>

            {systemInfo?.system && (
              <>
                {/* Información del Servidor */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border">
                    <div className="flex items-center space-x-3 mb-2">
                      <Server className="w-5 h-5 text-blue-500" />
                      <h4 className="font-medium text-gray-900 dark:text-white">Node.js</h4>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{systemInfo.system.nodeVersion}</p>
                  </div>

                  <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border">
                    <div className="flex items-center space-x-3 mb-2">
                      <Globe className="w-5 h-5 text-green-500" />
                      <h4 className="font-medium text-gray-900 dark:text-white">Plataforma</h4>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">{systemInfo.system.platform}</p>
                  </div>

                  <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border">
                    <div className="flex items-center space-x-3 mb-2">
                      <Activity className="w-5 h-5 text-purple-500" />
                      <h4 className="font-medium text-gray-900 dark:text-white">Entorno</h4>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">{systemInfo.system.environment}</p>
                  </div>

                  <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border">
                    <div className="flex items-center space-x-3 mb-2">
                      <Activity className="w-5 h-5 text-orange-500" />
                      <h4 className="font-medium text-gray-900 dark:text-white">Uptime</h4>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {Math.floor(systemInfo.system.systemUptime / 60)} min
                    </p>
                  </div>
                </div>

                {/* Uso de Memoria */}
                <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border">
                  <div className="flex items-center space-x-3 mb-4">
                    <Cpu className="w-5 h-5 text-pink-500" />
                    <h4 className="font-medium text-gray-900 dark:text-white">Uso de Memoria (MB)</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">RSS</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{systemInfo.system.memoryUsage.rss}</div>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Heap Total</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{systemInfo.system.memoryUsage.heapTotal}</div>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Heap Usado</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{systemInfo.system.memoryUsage.heapUsed}</div>
                    </div>
                    <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">External</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{systemInfo.system.memoryUsage.external}</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      
      case 'demo':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Datos de Demostración</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Pobla la base de datos con datos de ejemplo para probar la aplicación
              </p>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-xl border border-purple-200 dark:border-purple-800">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Poblar Base de Datos con Datos Demo
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Esta función agregará datos de ejemplo a tu base de datos, incluyendo:
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>2 usuarios adicionales (agentes)</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>5 contactos de ejemplo</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>3 conversaciones activas</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>~10 mensajes de conversación</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>2 mensajes programados</span>
                    </li>
                  </ul>
                  
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg mb-4">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Nota importante:</strong> Los datos existentes no se eliminarán. 
                        Esta función solo agrega nuevos datos de ejemplo. 
                        Si algunos datos ya existen, se omitirán automáticamente.
                      </div>
                    </div>
                  </div>

                  {tenant?.slug === 'flame' ? (
                    <button
                      onClick={handlePopulateDemoData}
                      disabled={populatingDemo}
                      className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                    >
                      {populatingDemo ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Poblando datos...</span>
                        </>
                      ) : (
                        <>
                          <Database className="w-5 h-5" />
                          <span>Poblar Datos de Demostración</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                      <p className="text-sm text-red-800 dark:text-red-200">
                        Esta función solo está disponible para la organización FLAME (demo).
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Información adicional */}
            <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border">
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">Credenciales de Usuarios Demo</h4>
              <div className="space-y-3">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Agente 1</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    📧 Email: <code className="bg-blue-100 dark:bg-blue-800 px-2 py-0.5 rounded">agente1@flame.com</code>
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    🔑 Contraseña: <code className="bg-blue-100 dark:bg-blue-800 px-2 py-0.5 rounded">flame123</code>
                  </p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-sm font-medium text-purple-900 dark:text-purple-100">Agente 2</p>
                  <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                    📧 Email: <code className="bg-purple-100 dark:bg-purple-800 px-2 py-0.5 rounded">agente2@flame.com</code>
                  </p>
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    🔑 Contraseña: <code className="bg-purple-100 dark:bg-purple-800 px-2 py-0.5 rounded">flame123</code>
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return <div>Selecciona una opción</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-bg dark:via-dark-surface dark:to-dark-card">
      {/* Header */}
      <div className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-border/50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                Configuración
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Gestiona tu cuenta, organización y configuración del sistema
              </p>
            </div>
            <Settings className="w-10 h-10 text-purple-500" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar con tabs */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-dark-surface rounded-2xl border border-gray-200 dark:border-dark-border p-4 space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contenido del tab activo */}
          <div className="lg:col-span-3">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigPage;
