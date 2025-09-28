import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Copy, 
  Tag, 
  Clock, 
  Star,
  MoreVertical,
  XCircle,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useTemplates } from '../../hooks/useTemplates';
import { ResponseTemplate, CreateTemplateRequest, UpdateTemplateRequest } from '../../services/api.service';

const TemplatesPage: React.FC = () => {
  const {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    searchTemplates,
    getTemplatesByCategory,
    duplicateTemplate,
    getTemplateStats
  } = useTemplates();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ResponseTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    content: '',
    category: 'general',
    priority: 1,
    response_delay: 0,
    conditions: [] as string[],
    is_active: true
  });

  const categories = [
    { value: 'general', label: 'General', color: 'bg-gray-500' },
    { value: 'greeting', label: 'Saludo', color: 'bg-blue-500' },
    { value: 'farewell', label: 'Despedida', color: 'bg-green-500' },
    { value: 'support', label: 'Soporte', color: 'bg-yellow-500' },
    { value: 'sales', label: 'Ventas', color: 'bg-purple-500' },
    { value: 'urgent', label: 'Urgente', color: 'bg-red-500' }
  ];

  const priorityLevels = [
    { value: 1, label: 'Baja', color: 'text-gray-500' },
    { value: 2, label: 'Media', color: 'text-yellow-500' },
    { value: 3, label: 'Alta', color: 'text-orange-500' },
    { value: 4, label: 'Crítica', color: 'text-red-500' }
  ];

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      searchTemplates(searchQuery);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (selectedCategory !== 'all') {
      getTemplatesByCategory(selectedCategory);
    }
  }, [selectedCategory]);

  const loadStats = async () => {
    try {
      const statsData = await getTemplateStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      content: '',
      category: 'general',
      priority: 1,
      response_delay: 0,
      conditions: [],
      is_active: true
    });
  };

  const handleCreateTemplate = async () => {
    if (!formData.name.trim() || !formData.content.trim()) return;

    try {
      const templateData: CreateTemplateRequest = {
        name: formData.name,
        content: formData.content,
        category: formData.category,
        priority: formData.priority,
        response_delay: formData.response_delay,
        conditions: formData.conditions,
        is_active: formData.is_active
      };

      await createTemplate(templateData);
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const handleEditTemplate = (template: ResponseTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      content: template.content,
      category: template.category,
      priority: template.priority,
      response_delay: template.response_delay,
      conditions: template.conditions || [],
      is_active: template.is_active
    });
    setShowCreateModal(true);
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate || !formData.name.trim() || !formData.content.trim()) return;

    try {
      const templateData: UpdateTemplateRequest = {
        name: formData.name,
        content: formData.content,
        category: formData.category,
        priority: formData.priority,
        response_delay: formData.response_delay,
        conditions: formData.conditions,
        is_active: formData.is_active
      };

      await updateTemplate(editingTemplate.id.toString(), templateData);
      setShowCreateModal(false);
      setEditingTemplate(null);
      resetForm();
    } catch (error) {
      console.error('Error updating template:', error);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteTemplate(id);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleDuplicateTemplate = async (template: ResponseTemplate) => {
    try {
      await duplicateTemplate(template.id.toString());
    } catch (error) {
      console.error('Error duplicating template:', error);
    }
  };

  const getCategoryColor = (category: string) => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.color : 'bg-gray-500';
  };

  const getPriorityColor = (priority: number) => {
    const level = priorityLevels.find(p => p.value === priority);
    return level ? level.color : 'text-gray-500';
  };

  const getPriorityLabel = (priority: number) => {
    const level = priorityLevels.find(p => p.value === priority);
    return level ? level.label : 'Desconocida';
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading && !templates.length) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Cargando plantillas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Plantillas de Respuestas
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Gestiona las plantillas de respuestas automáticas para tus asistentes
              </p>
            </div>
            <button
              onClick={() => {
                setEditingTemplate(null);
                resetForm();
                setShowCreateModal(true);
              }}
              className="bg-purple-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-600 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Nueva Plantilla</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Tag className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Activas</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Star className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Categorías</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.categories}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Con Delay</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.withDelay}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar plantillas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="sm:w-64">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">Todas las categorías</option>
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getCategoryColor(template.category)}`}></div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {categories.find(c => c.value === template.category)?.label}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className={`text-sm font-medium ${getPriorityColor(template.priority)}`}>
                      {getPriorityLabel(template.priority)}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${template.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {template.name}
                </h3>

                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                  {template.content}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
                  <div className="flex items-center space-x-4">
                    {template.response_delay > 0 && (
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{template.response_delay}s</span>
                      </div>
                    )}
                    {template.conditions && template.conditions.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <Filter className="w-3 h-3" />
                        <span>{template.conditions.length} condición(es)</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditTemplate(template)}
                      className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDuplicateTemplate(template)}
                      className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                      title="Duplicar"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(template.id.toString())}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No hay plantillas
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchQuery || selectedCategory !== 'all' 
                ? 'No se encontraron plantillas con los filtros aplicados'
                : 'Crea tu primera plantilla de respuesta para comenzar'
              }
            </p>
            {(!searchQuery && selectedCategory === 'all') && (
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="bg-purple-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-600 transition-colors"
              >
                Crear Primera Plantilla
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre de la Plantilla
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ej: Saludo de bienvenida"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contenido de la Plantilla
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Escribe el contenido de la plantilla..."
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
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {categories.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Prioridad
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {priorityLevels.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>
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

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="mr-3 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Plantilla Activa
                </label>
              </div>
            </div>

            <div className="flex space-x-3 pt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTemplate(null);
                  resetForm();
                }}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                className="flex-1 bg-purple-500 text-white px-4 py-3 rounded-xl font-medium hover:bg-purple-600 transition-colors flex items-center justify-center space-x-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{editingTemplate ? 'Actualizar' : 'Crear'} Plantilla</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                ¿Eliminar plantilla?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Esta acción no se puede deshacer. La plantilla será eliminada permanentemente.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteTemplate(showDeleteConfirm)}
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
  );
};

export default TemplatesPage;
