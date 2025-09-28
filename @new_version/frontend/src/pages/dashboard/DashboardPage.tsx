import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  MessageSquare, 
  Users, 
  Bot, 
  Tag, 
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { apiService } from '../../services/api.service';

interface DashboardStats {
  assistants: {
    total: number;
    active: number;
    inactive: number;
  };
  conversations: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  messages: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  contacts: {
    total: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
  };
  templates: {
    total: number;
    active: number;
    categories: number;
  };
  tags: {
    total: number;
    active: number;
    conversations: number;
    contacts: number;
  };
  assignments: {
    total: number;
    autoAssigned: number;
    manualAssigned: number;
  };
}

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cargar estadísticas de todos los módulos
      const [
        assistantsStats,
        templatesStats,
        tagsStats,
        assignmentsStats
      ] = await Promise.all([
        apiService.getAssistantsStats(),
        apiService.getTemplatesStats(),
        apiService.getTagsStats(),
        apiService.getAssignmentsStats()
      ]);

      // Simular estadísticas de conversaciones y mensajes (en un proyecto real vendrían del backend)
      const mockConversationStats = {
        total: 1247,
        today: 23,
        thisWeek: 156,
        thisMonth: 634
      };

      const mockMessageStats = {
        total: 8934,
        today: 187,
        thisWeek: 1243,
        thisMonth: 5234
      };

      const mockContactStats = {
        total: 892,
        newToday: 12,
        newThisWeek: 78,
        newThisMonth: 234
      };

      const dashboardStats: DashboardStats = {
        assistants: {
          total: assistantsStats.total || 0,
          active: assistantsStats.active || 0,
          inactive: (assistantsStats.total || 0) - (assistantsStats.active || 0)
        },
        conversations: mockConversationStats,
        messages: mockMessageStats,
        contacts: mockContactStats,
        templates: {
          total: templatesStats.total || 0,
          active: templatesStats.active || 0,
          categories: templatesStats.categories || 0
        },
        tags: {
          total: tagsStats.total || 0,
          active: tagsStats.active || 0,
          conversations: tagsStats.conversations || 0,
          contacts: tagsStats.contacts || 0
        },
        assignments: {
          total: assignmentsStats.total || 0,
          autoAssigned: assignmentsStats.autoAssigned || 0,
          manualAssigned: (assignmentsStats.total || 0) - (assignmentsStats.autoAssigned || 0)
        }
      };

      setStats(dashboardStats);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
      setError('Error al cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Error al cargar estadísticas
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={loadStats}
            className="bg-purple-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-600 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Dashboard
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Resumen general de tu sistema de mensajería
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {lastUpdated && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Actualizado: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
              <button
                onClick={loadStats}
                className="bg-purple-500 text-white px-4 py-2 rounded-xl font-medium hover:bg-purple-600 transition-colors flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Actualizar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Asistentes */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Asistentes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.assistants.total}</p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {stats.assistants.active} activos
                </p>
              </div>
            </div>
          </div>

          {/* Conversaciones */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <MessageSquare className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Conversaciones</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(stats.conversations.total)}</p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  +{stats.conversations.today} hoy
                </p>
              </div>
            </div>
          </div>

          {/* Mensajes */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Mensajes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(stats.messages.total)}</p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  +{stats.messages.today} hoy
                </p>
              </div>
            </div>
          </div>

          {/* Contactos */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Users className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Contactos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(stats.contacts.total)}</p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  +{stats.contacts.newToday} nuevos hoy
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Plantillas */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Plantillas</h3>
              <FileText className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
                <span className="font-semibold text-gray-900 dark:text-white">{stats.templates.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Activas</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{stats.templates.active}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Categorías</span>
                <span className="font-semibold text-gray-900 dark:text-white">{stats.templates.categories}</span>
              </div>
            </div>
          </div>

          {/* Etiquetas */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Etiquetas</h3>
              <Tag className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
                <span className="font-semibold text-gray-900 dark:text-white">{stats.tags.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Activas</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{stats.tags.active}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">En uso</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {stats.tags.conversations + stats.tags.contacts}
                </span>
              </div>
            </div>
          </div>

          {/* Asignaciones */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Asignaciones</h3>
              <CheckCircle className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
                <span className="font-semibold text-gray-900 dark:text-white">{stats.assignments.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Automáticas</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{stats.assignments.autoAssigned}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Manuales</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">{stats.assignments.manualAssigned}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Actividad Reciente */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Actividad Reciente</h3>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Mensajes hoy</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">{stats.messages.today}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Conversaciones hoy</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">{stats.conversations.today}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Nuevos contactos</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">{stats.contacts.newToday}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Asistentes activos</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">{stats.assistants.active}</span>
              </div>
            </div>
          </div>

          {/* Resumen Semanal */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Resumen Semanal</h3>
              <Clock className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">Conversaciones</span>
                <span className="font-semibold text-gray-900 dark:text-white">{stats.conversations.thisWeek}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">Mensajes</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(stats.messages.thisWeek)}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">Nuevos contactos</span>
                <span className="font-semibold text-gray-900 dark:text-white">{stats.contacts.newThisWeek}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">Plantillas utilizadas</span>
                <span className="font-semibold text-gray-900 dark:text-white">{stats.templates.active}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;