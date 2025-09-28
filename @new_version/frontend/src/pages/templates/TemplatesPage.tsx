import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  FileText, 
  MessageSquare,
  BarChart3,
  MoreVertical,
  XCircle,
  Loader2,
  CheckCircle,
  AlertCircle,
  Filter,
  Copy,
  Clock
} from 'lucide-react';
import { useTemplates, useTemplateStats } from '../../hooks/useTemplates';
import { ResponseTemplate, CreateTemplateRequest, UpdateTemplateRequest } from '../../services/api.service';

const TemplatesPage: React.FC = () => {
  const {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate
  } = useTemplates();
  
  const {
    stats: templateStats,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats
  } = useTemplateStats();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ResponseTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    content: '',
    trigger_keywords: [] as string[],
    category: '',
    priority: 0,
    response_delay: 0,
    is_active: true
  });

  const categories = [
    'Saludo',
    'Despedida',
    'Información',
    'Soporte',
    'Ventas',
    'General'
  ];


  // Filtrar plantillas
  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (template.category && template.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const resetForm = () => {
    setFormData({
      name: '',
      content: '',
      trigger_keywords: [],
      category: '',
      priority: 0,
      response_delay: 0,
      is_active: true
    });
  };

  const handleCreateTemplate = async () => {
    try {
      const templateData: CreateTemplateRequest = {
        name: formData.name,
        content: formData.content,
        trigger_keywords: formData.trigger_keywords,
        category: formData.category,
        priority: formData.priority,
        response_delay: formData.response_delay,
        is_active: formData.is_active
      };

      await createTemplate(templateData);
      setShowCreateModal(false);
      resetForm();
      refetchStats();
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const handleEditTemplate = (template: ResponseTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      content: template.content,
      trigger_keywords: template.trigger_keywords || [],
      category: template.category || '',
      priority: template.priority || 0,
      response_delay: template.response_delay || 0,
      is_active: template.is_active
    });
    setShowCreateModal(true);
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    try {
      const updateData: UpdateTemplateRequest = {
        name: formData.name,
        content: formData.content,
        trigger_keywords: formData.trigger_keywords,
        category: formData.category,
        priority: formData.priority,
        response_delay: formData.response_delay,
        is_active: formData.is_active
      };

      await updateTemplate(editingTemplate.id.toString(), updateData);
      setShowCreateModal(false);
      setEditingTemplate(null);
      resetForm();
      refetchStats();
    } catch (error) {
      console.error('Error updating template:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await deleteTemplate(templateId);
      setShowDeleteConfirm(null);
      refetchStats();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const addKeyword = () => {
    setFormData({
      ...formData,
      trigger_keywords: [...formData.trigger_keywords, '']
    });
  };

  const updateKeyword = (index: number, value: string) => {
    const newKeywords = [...formData.trigger_keywords];
    newKeywords[index] = value;
    setFormData({ ...formData, trigger_keywords: newKeywords });
  };

  const removeKeyword = (index: number) => {
    const newKeywords = formData.trigger_keywords.filter((_, i) => i !== index);
    setFormData({ ...formData, trigger_keywords: newKeywords });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-bg dark:via-dark-surface dark:to-dark-card flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Cargando plantillas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-bg dark:via-dark-surface dark:to-dark-card flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">Error al cargar las plantillas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-bg dark:via-dark-surface dark:to-dark-card">
      {/* Header */}
      <div className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-border/50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                Plantillas de Respuestas
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Gestiona las plantillas de respuestas automáticas para tus asistentes
              </p>
            </div>
            <button
              onClick={() => {
                setEditingTemplate(null);
                resetForm();
                setShowCreateModal(true);
              }}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              <span>Nueva Plantilla</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Stats Cards */}
        {templateStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-dark-border/50 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-xl">
                  <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Plantillas</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{templateStats.total_templates}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-dark-border/50 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Activas</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{templateStats.active_templates}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-dark-border/50 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
                  <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Categorías</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{Object.keys(templateStats.templates_by_category || {}).length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-dark-border/50 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar plantillas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Templates List */}
        <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-sm border border-gray-200 dark:border-dark-border overflow-hidden">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No se encontraron plantillas
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery ? 'No hay plantillas que coincidan con tu búsqueda' : 'No hay plantillas disponibles'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {filteredTemplates.map((template) => (
                <div key={template.id} className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white mb-1">{template.name}</h3>
                        {template.category && (
                          <span className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400 text-xs rounded-full">
                            {template.category}
                          </span>
                        )}
                      </div>
                      <div className="relative group">
                        <button className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-dark-surface rounded-lg shadow-lg border border-gray-200 dark:border-dark-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                          <div className="py-1">
                            <button
                              onClick={() => handleEditTemplate(template)}
                              className="w-full px-4 py-2 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center space-x-2"
                            >
                              <Edit className="w-4 h-4" />
                              <span>Editar</span>
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(template.id.toString())}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                      {template.content}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          template.is_active 
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400'
                        }`}>
                          {template.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                        {template.priority && template.priority > 0 && (
                          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 text-xs rounded-full">
                            Prioridad {template.priority}
                          </span>
                        )}
                      </div>
                      {template.response_delay && template.response_delay > 0 && (
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="w-3 h-3 mr-1" />
                          {template.response_delay}s
                        </div>
                      )}
                    </div>
                    {template.trigger_keywords && template.trigger_keywords.length > 0 && (
                      <div className="mt-3">
                        <div className="flex flex-wrap gap-1">
                          {template.trigger_keywords.slice(0, 3).map((keyword, index) => (
                            <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                              {keyword}
                            </span>
                          ))}
                          {template.trigger_keywords.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                              +{template.trigger_keywords.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de creación/edición */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-dark-surface rounded-2xl p-8 max-w-2xl w-full border border-gray-200/50 dark:border-dark-border/50 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingTemplate ? 'Editar Plantilla' : 'Crear Nueva Plantilla'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTemplate(null);
                  resetForm();
                }}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <XCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white"
                  placeholder="Nombre de la plantilla"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contenido
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white"
                  placeholder="Contenido de la plantilla"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Categoría
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white"
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Prioridad
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Palabras Clave
                </label>
                <div className="space-y-2">
                  {formData.trigger_keywords.map((keyword, index) => (
                    <div key={index} className="flex space-x-2">
                      <input
                        type="text"
                        value={keyword}
                        onChange={(e) => updateKeyword(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white"
                        placeholder="Palabra clave"
                      />
                      <button
                        type="button"
                        onClick={() => removeKeyword(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addKeyword}
                    className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm font-medium"
                  >
                    + Agregar palabra clave
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Retraso de Respuesta (segundos)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.response_delay}
                  onChange={(e) => setFormData({ ...formData, response_delay: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Plantilla activa
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTemplate(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
              >
                {editingTemplate ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-dark-surface rounded-2xl p-8 max-w-md w-full border border-gray-200/50 dark:border-dark-border/50">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Eliminar Plantilla
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Esta acción no se puede deshacer
                </p>
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              ¿Estás seguro de que quieres eliminar esta plantilla? Se eliminará de todos los asistentes que la estén usando.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteTemplate(showDeleteConfirm)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatesPage;