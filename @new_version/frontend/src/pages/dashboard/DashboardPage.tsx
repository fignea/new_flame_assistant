import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Users, 
  FileText, 
  Bot, 
  Zap, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Activity,
  RefreshCw
} from 'lucide-react';
import { apiService } from '../../services/api.service';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState([
    {
      title: 'Conversaciones Activas',
      value: '0',
      change: '+0%',
      changeType: 'positive',
      icon: MessageSquare,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Mensajes Hoy',
      value: '0',
      change: '+0%',
      changeType: 'positive',
      icon: Zap,
      color: 'from-purple-500 to-pink-500'
    },
    {
      title: 'Contactos Totales',
      value: '0',
      change: '+0%',
      changeType: 'positive',
      icon: Users,
      color: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Programación',
      value: '0',
      change: '+0%',
      changeType: 'positive',
      icon: Clock,
      color: 'from-orange-500 to-red-500'
    }
  ]);

  const [whatsappStatus, setWhatsappStatus] = useState<{
    isConnected: boolean;
    isAuthenticated: boolean;
    phoneNumber?: string;
    userName?: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Cargar datos del dashboard
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Cargar estado de WhatsApp
      const whatsappResponse = await apiService.getWhatsAppStatus();
      if (whatsappResponse.success) {
        setWhatsappStatus(whatsappResponse.data);
      }

      // Cargar contactos
      const contactsResponse = await apiService.getContacts({ page: 1, limit: 1 });
      if (contactsResponse.success && contactsResponse.data) {
        const contactsData = contactsResponse.data as any;
        setStats(prev => prev.map(stat => 
          stat.title === 'Contactos Totales' 
            ? { ...stat, value: contactsData.pagination?.total?.toString() || '0' }
            : stat
        ));
      }

      // Cargar programación
      const scheduledResponse = await apiService.getScheduledMessages({ page: 1, limit: 1 });
      if (scheduledResponse.success && scheduledResponse.data) {
        const scheduledData = scheduledResponse.data as any;
        setStats(prev => prev.map(stat => 
          stat.title === 'Programación' 
            ? { ...stat, value: scheduledData.pagination?.total?.toString() || '0' }
            : stat
        ));
      }

      // Cargar estadísticas de mensajes
      const messagesResponse = await apiService.getMessageStats();
      if (messagesResponse.success && messagesResponse.data) {
        const messagesData = messagesResponse.data;
        setStats(prev => prev.map(stat => {
          if (stat.title === 'Mensajes Hoy') {
            return { ...stat, value: messagesData.today?.toString() || '0' };
          }
          if (stat.title === 'Conversaciones Activas') {
            return { ...stat, value: messagesData.activeConversations?.toString() || '0' };
          }
          return stat;
        }));
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    
    // Actualizar datos cada 30 segundos
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const recentActivities = [
    {
      id: 1,
      type: 'message',
      title: 'Nueva conversación iniciada',
      description: 'María González - WhatsApp',
      time: 'Hace 2 minutos',
      icon: MessageSquare,
      color: 'text-blue-500'
    },
    {
      id: 2,
      type: 'contact',
      title: 'Contacto agregado',
      description: 'Carlos Rodríguez - Webchat',
      time: 'Hace 5 minutos',
      icon: Users,
      color: 'text-green-500'
    },
    {
      id: 3,
      type: 'document',
      title: 'Documento procesado',
      description: 'Manual de usuario.pdf',
      time: 'Hace 12 minutos',
      icon: FileText,
      color: 'text-purple-500'
    },
    {
      id: 4,
      type: 'assistant',
      title: 'Asistente actualizado',
      description: 'Bot de Ventas v2.1',
      time: 'Hace 1 hora',
      icon: Bot,
      color: 'text-orange-500'
    }
  ];

  const quickActions = [
    {
      title: 'Ver Conversaciones',
      description: 'Gestiona todas las conversaciones activas',
      icon: MessageSquare,
      color: 'from-blue-500 to-cyan-500',
      href: 'inbox'
    },
    {
      title: 'Gestionar Contactos',
      description: 'Administra tu base de contactos',
      icon: Users,
      color: 'from-green-500 to-emerald-500',
      href: 'contacts'
    },
    {
      title: 'Configurar Asistentes',
      description: 'Personaliza tus bots de IA',
      icon: Bot,
      color: 'from-purple-500 to-pink-500',
      href: 'assistants'
    },
    {
      title: 'Ver Documentos',
      description: 'Accede a tu biblioteca de documentos',
      icon: FileText,
      color: 'from-orange-500 to-red-500',
      href: 'documents'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-bg dark:via-dark-surface dark:to-dark-card">
      {/* Header */}
      <div className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-border/50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Bienvenido de vuelta. Aquí tienes un resumen de tu actividad.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  whatsappStatus?.isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span>
                  {whatsappStatus?.isConnected 
                    ? `WhatsApp Conectado${whatsappStatus.userName ? ` - ${whatsappStatus.userName}` : ''}`
                    : 'WhatsApp Desconectado'
                  }
                </span>
              </div>
              <button
                onClick={loadDashboardData}
                disabled={loading}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
                title="Actualizar datos"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
                <div className="relative bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-dark-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                      <p className={`text-sm font-medium mt-1 ${
                        stat.changeType === 'positive' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {stat.change}
                      </p>
                    </div>
                    <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-dark-border/50">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Actividad Reciente</h2>
                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                  <Activity className="w-4 h-4" />
                  <span>Última actualización: {lastUpdated.toLocaleTimeString()}</span>
                </div>
              </div>
              <div className="space-y-4">
                {recentActivities.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <div key={activity.id} className="flex items-start space-x-4 p-4 rounded-xl bg-gray-50/50 dark:bg-dark-bg/50 hover:bg-gray-100/50 dark:hover:bg-dark-bg/80 transition-colors">
                      <div className={`w-10 h-10 rounded-xl bg-gray-100 dark:bg-dark-surface flex items-center justify-center ${activity.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.title}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{activity.description}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <div className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-dark-border/50">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Acciones Rápidas</h2>
              <div className="space-y-4">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={index}
                      className="w-full flex items-start space-x-4 p-4 rounded-xl bg-gray-50/50 dark:bg-dark-bg/50 hover:bg-gray-100/50 dark:hover:bg-dark-bg/80 transition-all duration-200 hover:transform hover:scale-105"
                    >
                      <div className={`w-10 h-10 bg-gradient-to-r ${action.color} rounded-xl flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{action.title}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{action.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Performance Chart Placeholder */}
        <div className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-dark-border/50">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Rendimiento del Sistema</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <BarChart3 className="w-4 h-4" />
              <span>Últimos 7 días</span>
            </div>
          </div>
          <div className="h-64 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">Gráfico de rendimiento</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Próximamente</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
