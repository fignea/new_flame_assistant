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
  RefreshCw,
  Settings,
  BarChart3,
  Key,
  Zap,
  MessageSquare,
  Tag
} from 'lucide-react';
import { apiService, Assistant as AssistantType } from '../../services/api.service';
import { useNotificationHelpers } from '../../components/NotificationSystem';
import { useTemplates } from '../../hooks/useTemplates';
import { useTags } from '../../hooks/useTags';

interface Schedule {
  id: string;
  dayOfWeek: number; // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  enabled: boolean;
}

// Usar la interfaz del servicio API
type Assistant = AssistantType;

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
    prompt: '',
    is_active: true,
    openai_api_key: '',
    model: 'gpt-3.5-turbo',
    max_tokens: 150,
    temperature: 0.7,
    auto_assign: true,
    response_delay: 0,
    type: 'ai' as 'ai' | 'auto',
    integrations: [] as string[]
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
        prompt: formData.prompt,
        is_active: formData.is_active,
        openai_api_key: formData.openai_api_key,
        model: formData.model,
        max_tokens: formData.max_tokens,
        temperature: formData.temperature,
        auto_assign: formData.auto_assign,
        response_delay: formData.response_delay
      };

      const response = await apiService.createAssistant(assistantData);
      if (response.success) {
        setShowCreateModal(false);
        resetForm();
        loadAssistants(); // Recargar la lista
        showSuccess('Asistente creado', 'El asistente se ha creado exitosamente');
      } else {
        showError('Error al crear asistente', response.message || 'No se pudo crear el asistente');
      }
    } catch (error) {
      console.error('Error creating assistant:', error);
      showError('Error al crear asistente', 'No se pudo crear el asistente');
    }
  };

  const handleEditAssistant = (id: string) => {
    const assistant = assistants.find(a => a.id.toString() === id);
    if (assistant) {
      setEditingAssistant(assistant);
      setFormData({
        name: assistant.name,
        description: assistant.description || '',
        prompt: assistant.prompt || '',
        is_active: assistant.is_active,
        openai_api_key: assistant.openai_api_key || '',
        model: assistant.model,
        max_tokens: assistant.max_tokens,
        temperature: assistant.temperature,
        auto_assign: assistant.auto_assign,
        response_delay: assistant.response_delay,
        type: 'ai' as 'ai' | 'auto',
        integrations: []
      });
      setShowCreateModal(true);
    }
  };

  const handleUpdateAssistant = async () => {
    if (!editingAssistant || !formData.name.trim()) return;

    try {
      const updateData = {
        name: formData.name,
        description: formData.description,
        prompt: formData.prompt,
        is_active: formData.is_active,
        openai_api_key: formData.openai_api_key,
        model: formData.model,
        max_tokens: formData.max_tokens,
        temperature: formData.temperature,
        auto_assign: formData.auto_assign,
        response_delay: formData.response_delay
      };

      const response = await apiService.updateAssistant(editingAssistant.id.toString(), updateData);
      if (response.success) {
        setShowCreateModal(false);
        setEditingAssistant(null);
        resetForm();
        loadAssistants(); // Recargar la lista
        showSuccess('Asistente actualizado', 'El asistente se ha actualizado exitosamente');
      } else {
        showError('Error al actualizar asistente', response.message || 'No se pudo actualizar el asistente');
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
        is_active: !assistants.find(a => a.id.toString() === id)?.is_active
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
      prompt: '',
      is_active: true,
      openai_api_key: '',
      model: 'gpt-3.5-turbo',
      max_tokens: 150,
      temperature: 0.7,
      auto_assign: true,
      response_delay: 0,
      type: 'ai' as 'ai' | 'auto',
      integrations: []
    });
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'text-green-500 bg-green-500/10' : 'text-gray-500 bg-gray-500/10';
  };

  const getStatusText = (isActive: boolean) => {
    return isActive ? 'Activo' : 'Inactivo';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-bg dark:via-dark-surface dark:to-dark-card">
      {/* Header */}
      <div className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-border/50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                Asistentes
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Crea y gestiona tus asistentes de IA personalizados
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={loadAssistants}
                disabled={loading}
                className="bg-gray-500 text-white px-4 py-3 rounded-xl font-medium hover:bg-gray-600 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
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
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
              >
                <Plus className="w-5 h-5" />
                <span>Nuevo Asistente</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">

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
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assistant.is_active)}`}>
                        {getStatusText(assistant.is_active)}
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

                {/* Model and Configuration */}
                <div className="flex items-center space-x-2 mb-4">
                  <div className="flex items-center space-x-1 text-blue-500 bg-blue-500/10 px-2 py-1 rounded-full text-xs font-medium">
                    <Brain className="w-3 h-3" />
                    <span>{assistant.model}</span>
                  </div>
                  {assistant.auto_assign && (
                    <div className="flex items-center space-x-1 text-green-500 bg-green-500/10 px-2 py-1 rounded-full text-xs font-medium">
                      <Zap className="w-3 h-3" />
                      <span>Auto-asignar</span>
                    </div>
                  )}
                </div>

                {/* Configuration Details */}
                <div className="mb-4 space-y-2">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Max Tokens:</span>
                    <span>{assistant.max_tokens}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Temperatura:</span>
                    <span>{assistant.temperature}</span>
                  </div>
                  {assistant.response_delay > 0 && (
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Delay:</span>
                      <span>{assistant.response_delay}s</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => toggleAssistantStatus(assistant.id.toString())}
                    className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      assistant.is_active
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    {assistant.is_active ? (
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
                    onClick={() => handleEditAssistant(assistant.id.toString())}
                    className="px-3 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(assistant.id.toString())}
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

                {/* AI Configuration */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Prompt del Sistema
                    </label>
                    <textarea
                      value={formData.prompt}
                      onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Define cómo debe comportarse el asistente de IA. Incluye información sobre tu empresa, productos, servicios, etc."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Modelo de OpenAI
                      </label>
                      <select
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                        <option value="gpt-4">GPT-4</option>
                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Max Tokens
                      </label>
                      <input
                        type="number"
                        value={formData.max_tokens}
                        onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        min="1"
                        max="4096"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Temperatura
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="2"
                        value={formData.temperature}
                        onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Delay de Respuesta (segundos)
                      </label>
                      <input
                        type="number"
                        value={formData.response_delay}
                        onChange={(e) => setFormData({ ...formData, response_delay: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        min="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      API Key de OpenAI
                    </label>
                    <input
                      type="password"
                      value={formData.openai_api_key}
                      onChange={(e) => setFormData({ ...formData, openai_api_key: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="sk-..."
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="mr-3 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                      />
                      <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Asistente Activo
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="auto_assign"
                        checked={formData.auto_assign}
                        onChange={(e) => setFormData({ ...formData, auto_assign: e.target.checked })}
                        className="mr-3 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                      />
                      <label htmlFor="auto_assign" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Auto-asignar a conversaciones
                      </label>
                    </div>
                  </div>
                </div>

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
                    onClick={() => handleDeleteAssistant(showDeleteConfirm!)}
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
