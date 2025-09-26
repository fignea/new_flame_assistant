import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  FileText, 
  Upload,
  Brain,
  XCircle,
  MoreVertical,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react';
import { apiService } from '../../services/api.service';
import { useNotificationHelpers } from '../../components/NotificationSystem';

interface Schedule {
  id: string;
  dayOfWeek: number; // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  enabled: boolean;
}

interface Assistant {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'training';
  type: 'auto' | 'ai';
  integrations: string[];
  createdAt: string;
  lastUsed: string;
  responses: {
    autoResponse?: string;
    aiPrompt?: string;
    documents?: string[];
    schedule?: Schedule[];
  };
}

export const AssistantsPage: React.FC = () => {
  const { showSuccess, showError } = useNotificationHelpers();
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<Assistant | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Cargar asistentes desde el backend
  const loadAssistants = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAssistants();
      if (response.success && response.data) {
        const data = response.data as any;
        setAssistants(data.data || []);
      }
    } catch (error) {
      console.error('Error loading assistants:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssistants();
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'auto' as 'auto' | 'ai',
    integrations: [] as string[],
    autoResponse: '',
    aiPrompt: '',
    documents: [] as File[],
    schedule: [] as Schedule[]
  });

  const availableIntegrations = [
    { id: 'whatsapp-web', name: 'WhatsApp Web', available: true },
    { id: 'facebook', name: 'Facebook', available: false },
    { id: 'instagram', name: 'Instagram', available: false },
    { id: 'whatsapp-business', name: 'WhatsApp Business', available: false }
  ];

  const daysOfWeek = [
    { value: 0, label: 'Domingo', short: 'Dom' },
    { value: 1, label: 'Lunes', short: 'Lun' },
    { value: 2, label: 'Martes', short: 'Mar' },
    { value: 3, label: 'Miércoles', short: 'Mié' },
    { value: 4, label: 'Jueves', short: 'Jue' },
    { value: 5, label: 'Viernes', short: 'Vie' },
    { value: 6, label: 'Sábado', short: 'Sáb' }
  ];

  const handleCreateAssistant = async () => {
    if (!formData.name.trim()) return;

    try {
      const assistantData = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        integrations: formData.integrations,
        responses: {
          autoResponse: formData.type === 'auto' ? formData.autoResponse : undefined,
          aiPrompt: formData.type === 'ai' ? formData.aiPrompt : undefined,
          documents: formData.documents.map(file => file.name),
          schedule: formData.type === 'auto' ? formData.schedule : undefined
        }
      };

      const response = await apiService.createAssistant(assistantData);
      if (response.success) {
        setShowCreateModal(false);
        resetForm();
        loadAssistants(); // Recargar la lista
        showSuccess('Asistente creado', 'El asistente se ha creado exitosamente');
      } else {
        showError('Error al crear asistente', 'No se pudo crear el asistente');
      }
    } catch (error) {
      console.error('Error creating assistant:', error);
      showError('Error al crear asistente', 'No se pudo crear el asistente');
    }
  };

  const handleEditAssistant = (assistant: Assistant) => {
    setEditingAssistant(assistant);
    setFormData({
      name: assistant.name,
      description: assistant.description,
      type: assistant.type,
      integrations: assistant.integrations,
      autoResponse: assistant.responses.autoResponse || '',
      aiPrompt: assistant.responses.aiPrompt || '',
      documents: [],
      schedule: assistant.responses.schedule || []
    });
    setShowCreateModal(true);
  };

  const handleUpdateAssistant = async () => {
    if (!editingAssistant || !formData.name.trim()) return;

    try {
      const updateData = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        integrations: formData.integrations,
        responses: {
          autoResponse: formData.type === 'auto' ? formData.autoResponse : undefined,
          aiPrompt: formData.type === 'ai' ? formData.aiPrompt : undefined,
          documents: formData.documents.length > 0 
            ? formData.documents.map(file => file.name)
            : editingAssistant.responses.documents || [],
          schedule: formData.type === 'auto' ? formData.schedule : undefined
        }
      };

      const response = await apiService.updateAssistant(editingAssistant.id, updateData);
      if (response.success) {
        setShowCreateModal(false);
        setEditingAssistant(null);
        resetForm();
        loadAssistants(); // Recargar la lista
        showSuccess('Asistente actualizado', 'El asistente se ha actualizado exitosamente');
      } else {
        showError('Error al actualizar asistente', 'No se pudo actualizar el asistente');
      }
    } catch (error) {
      console.error('Error updating assistant:', error);
      showError('Error al actualizar asistente', 'No se pudo actualizar el asistente');
    }
  };

  const handleDeleteAssistant = async (id: string) => {
    try {
      const response = await apiService.deleteAssistant(id);
      if (response.success) {
        setShowDeleteConfirm(null);
        loadAssistants(); // Recargar la lista
        showSuccess('Asistente eliminado', 'El asistente se ha eliminado exitosamente');
      } else {
        showError('Error al eliminar asistente', 'No se pudo eliminar el asistente');
      }
    } catch (error) {
      console.error('Error deleting assistant:', error);
      showError('Error al eliminar asistente', 'No se pudo eliminar el asistente');
    }
  };

  const toggleAssistantStatus = async (id: string) => {
    try {
      const response = await apiService.updateAssistant(id, { 
        status: assistants.find(a => a.id === id)?.status === 'active' ? 'inactive' : 'active' 
      });
      if (response.success) {
        loadAssistants(); // Recargar la lista
        showSuccess('Estado actualizado', 'El estado del asistente se ha actualizado exitosamente');
      } else {
        showError('Error al cambiar estado', 'No se pudo cambiar el estado del asistente');
      }
    } catch (error) {
      console.error('Error toggling assistant status:', error);
      showError('Error al cambiar estado', 'No se pudo cambiar el estado del asistente');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'auto',
      integrations: [],
      autoResponse: '',
      aiPrompt: '',
      documents: [],
      schedule: []
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setFormData({ ...formData, documents: [...formData.documents, ...files] });
  };

  const addScheduleEntry = () => {
    const newSchedule: Schedule = {
      id: Date.now().toString(),
      dayOfWeek: 1, // Lunes por defecto
      startTime: '09:00',
      endTime: '18:00',
      enabled: true
    };
    setFormData({ ...formData, schedule: [...formData.schedule, newSchedule] });
  };

  const updateScheduleEntry = (id: string, field: keyof Schedule, value: any) => {
    setFormData({
      ...formData,
      schedule: formData.schedule.map(schedule => 
        schedule.id === id ? { ...schedule, [field]: value } : schedule
      )
    });
  };

  const removeScheduleEntry = (id: string) => {
    setFormData({
      ...formData,
      schedule: formData.schedule.filter(schedule => schedule.id !== id)
    });
  };

  const getScheduleSummary = (schedule: Schedule[]) => {
    if (!schedule || schedule.length === 0) return 'Sin horario configurado';
    
    const enabledDays = schedule.filter(s => s.enabled);
    if (enabledDays.length === 0) return 'Horario deshabilitado';
    
    const dayNames = enabledDays.map(s => daysOfWeek.find(d => d.value === s.dayOfWeek)?.short).join(', ');
    const times = enabledDays[0] ? `${enabledDays[0].startTime} - ${enabledDays[0].endTime}` : '';
    
    return `${dayNames} ${times}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-500 bg-green-500/10';
      case 'inactive': return 'text-gray-500 bg-gray-500/10';
      case 'training': return 'text-yellow-500 bg-yellow-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'inactive': return 'Inactivo';
      case 'training': return 'Entrenando';
      default: return 'Desconocido';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-bg dark:via-dark-surface dark:to-dark-card p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
              Asistentes
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Crea y gestiona tus asistentes de IA personalizados
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={loadAssistants}
              disabled={loading}
              className="mt-4 sm:mt-0 bg-gray-500 text-white px-4 py-3 rounded-xl font-medium hover:bg-gray-600 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
            <button
              onClick={() => {
                resetForm();
                setEditingAssistant(null);
                setShowCreateModal(true);
              }}
              className="mt-4 sm:mt-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Nuevo Asistente</span>
            </button>
          </div>
        </div>

        {/* Assistants Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Cargando asistentes...</p>
          </div>
        ) : assistants.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Bot className="w-12 h-12 text-purple-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No tienes asistentes creados
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Crea tu primer asistente para comenzar a automatizar tus conversaciones
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
            >
              Crear Primer Asistente
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assistants.map((assistant) => (
              <div
                key={assistant.id}
                className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-dark-border/50 hover:border-purple-300/50 dark:hover:border-purple-400/50 hover:shadow-lg transition-all duration-300"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
                      <Bot className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {assistant.name}
                      </h3>
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assistant.status)}`}>
                        {getStatusText(assistant.status)}
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <button className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <MoreVertical className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {assistant.description}
                </p>

                {/* Type Badge */}
                <div className="flex items-center space-x-2 mb-4">
                  {assistant.type === 'ai' ? (
                    <div className="flex items-center space-x-1 text-blue-500 bg-blue-500/10 px-2 py-1 rounded-full text-xs font-medium">
                      <Brain className="w-3 h-3" />
                      <span>IA</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-green-500 bg-green-500/10 px-2 py-1 rounded-full text-xs font-medium">
                      <Clock className="w-3 h-3" />
                      <span>Automático</span>
                    </div>
                  )}
                </div>

                {/* Integrations */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Integraciones:</p>
                  <div className="flex flex-wrap gap-1">
                    {assistant.integrations.map((integration) => {
                      const integrationInfo = availableIntegrations.find(i => i.id === integration);
                      return (
                        <span
                          key={integration}
                          className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full"
                        >
                          {integrationInfo?.name || integration}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Schedule Info for Auto Assistants */}
                {assistant.type === 'auto' && assistant.responses.schedule && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Horario:</p>
                    <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{getScheduleSummary(assistant.responses.schedule)}</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => toggleAssistantStatus(assistant.id)}
                    className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      assistant.status === 'active'
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    {assistant.status === 'active' ? (
                      <>
                        <Pause className="w-4 h-4 inline mr-1" />
                        Pausar
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 inline mr-1" />
                        Activar
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleEditAssistant(assistant)}
                    className="px-3 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(assistant.id)}
                    className="px-3 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-dark-surface rounded-2xl p-8 max-w-2xl w-full border border-gray-200/50 dark:border-dark-border/50 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingAssistant ? 'Editar Asistente' : 'Crear Nuevo Asistente'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingAssistant(null);
                    resetForm();
                  }}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <XCircle className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nombre del Asistente
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Ej: Asistente de Ventas"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tipo de Asistente
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'auto' | 'ai' })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="auto">Respuestas Automáticas</option>
                      <option value="ai">Respuestas con IA</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Describe el propósito y funcionamiento del asistente"
                  />
                </div>

                {/* Integrations */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Integraciones
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableIntegrations.map((integration) => (
                      <label
                        key={integration.id}
                        className={`flex items-center space-x-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                          formData.integrations.includes(integration.id)
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card'
                        } ${!integration.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.integrations.includes(integration.id)}
                          onChange={(e) => {
                            if (!integration.available) return;
                            const newIntegrations = e.target.checked
                              ? [...formData.integrations, integration.id]
                              : formData.integrations.filter(id => id !== integration.id);
                            setFormData({ ...formData, integrations: newIntegrations });
                          }}
                          disabled={!integration.available}
                          className="rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                        />
                        <span className={`text-sm ${!integration.available ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {integration.name}
                        </span>
                        {!integration.available && (
                          <span className="text-xs text-gray-400">(Próximamente)</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Response Configuration */}
                {formData.type === 'auto' ? (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Respuesta Automática
                      </label>
                      <textarea
                        value={formData.autoResponse}
                        onChange={(e) => setFormData({ ...formData, autoResponse: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Escribe la respuesta que enviará el asistente automáticamente..."
                      />
                    </div>

                    {/* Schedule Configuration */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Horario de Respuestas Automáticas
                        </label>
                        <button
                          type="button"
                          onClick={addScheduleEntry}
                          className="bg-purple-500 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-purple-600 transition-colors flex items-center space-x-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Agregar Día</span>
                        </button>
                      </div>

                      {formData.schedule.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 dark:bg-dark-card rounded-xl border-2 border-dashed border-gray-300 dark:border-dark-border">
                          <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                            No hay horarios configurados
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Agrega días y horarios para configurar cuándo enviar respuestas automáticas
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {formData.schedule.map((schedule) => (
                            <div key={schedule.id} className="bg-gray-50 dark:bg-dark-card rounded-xl p-4 border border-gray-200 dark:border-dark-border">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Día
                                  </label>
                                  <select
                                    value={schedule.dayOfWeek}
                                    onChange={(e) => updateScheduleEntry(schedule.id, 'dayOfWeek', parseInt(e.target.value))}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                  >
                                    {daysOfWeek.map((day) => (
                                      <option key={day.value} value={day.value}>
                                        {day.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Hora Inicio
                                  </label>
                                  <input
                                    type="time"
                                    value={schedule.startTime}
                                    onChange={(e) => updateScheduleEntry(schedule.id, 'startTime', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Hora Fin
                                  </label>
                                  <input
                                    type="time"
                                    value={schedule.endTime}
                                    onChange={(e) => updateScheduleEntry(schedule.id, 'endTime', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                  />
                                </div>

                                <div className="flex items-center space-x-2">
                                  <label className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      checked={schedule.enabled}
                                      onChange={(e) => updateScheduleEntry(schedule.id, 'enabled', e.target.checked)}
                                      className="rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                                    />
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Activo</span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => removeScheduleEntry(schedule.id)}
                                    className="p-1 text-red-500 hover:text-red-700 transition-colors"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          💡 <strong>Tip:</strong> Las respuestas automáticas solo se enviarán durante los horarios configurados. 
                          Fuera de estos horarios, el asistente no responderá automáticamente.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Prompt de IA
                      </label>
                      <textarea
                        value={formData.aiPrompt}
                        onChange={(e) => setFormData({ ...formData, aiPrompt: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Define cómo debe comportarse el asistente de IA. Incluye información sobre tu empresa, productos, servicios, etc."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Documentos de Entrenamiento
                      </label>
                      <div className="border-2 border-dashed border-gray-300 dark:border-dark-border rounded-xl p-6 text-center">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Arrastra archivos aquí o haz clic para seleccionar
                        </p>
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="file-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          className="inline-block bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-600 transition-colors cursor-pointer"
                        >
                          Seleccionar Archivos
                        </label>
                      </div>
                      {formData.documents.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {formData.documents.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-dark-card p-2 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <FileText className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                              </div>
                              <button
                                onClick={() => {
                                  const newDocuments = formData.documents.filter((_, i) => i !== index);
                                  setFormData({ ...formData, documents: newDocuments });
                                }}
                                className="text-red-500 hover:text-red-700"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingAssistant(null);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={editingAssistant ? handleUpdateAssistant : handleCreateAssistant}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                  >
                    {editingAssistant ? 'Actualizar' : 'Crear'} Asistente
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-dark-surface rounded-2xl p-8 max-w-md w-full border border-gray-200/50 dark:border-dark-border/50">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  ¿Eliminar Asistente?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Esta acción no se puede deshacer. El asistente será eliminado permanentemente.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDeleteAssistant(showDeleteConfirm)}
                    className="flex-1 bg-red-500 text-white px-4 py-2 rounded-xl font-medium hover:bg-red-600 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
