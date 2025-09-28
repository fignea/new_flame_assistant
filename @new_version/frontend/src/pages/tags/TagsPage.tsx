import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Tag, 
  MessageSquare,
  Users,
  BarChart3,
  MoreVertical,
  XCircle,
  Loader2,
  CheckCircle,
  AlertCircle,
  Filter
} from 'lucide-react';
import { useTags } from '../../hooks/useTags';
import { Tag as TagType, CreateTagRequest, UpdateTagRequest } from '../../services/api.service';

const TagsPage: React.FC = () => {
  const {
    tags,
    loading,
    error,
    createTag,
    updateTag,
    deleteTag,
    getTagStats
  } = useTags();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTag, setEditingTag] = useState<TagType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    is_active: true
  });

  const colorOptions = [
    { value: '#3B82F6', label: 'Azul', class: 'bg-blue-500' },
    { value: '#10B981', label: 'Verde', class: 'bg-green-500' },
    { value: '#F59E0B', label: 'Amarillo', class: 'bg-yellow-500' },
    { value: '#EF4444', label: 'Rojo', class: 'bg-red-500' },
    { value: '#8B5CF6', label: 'Púrpura', class: 'bg-purple-500' },
    { value: '#EC4899', label: 'Rosa', class: 'bg-pink-500' },
    { value: '#06B6D4', label: 'Cian', class: 'bg-cyan-500' },
    { value: '#84CC16', label: 'Lima', class: 'bg-lime-500' },
    { value: '#F97316', label: 'Naranja', class: 'bg-orange-500' },
    { value: '#6B7280', label: 'Gris', class: 'bg-gray-500' }
  ];

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const statsData = await getTagStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      is_active: true
    });
  };

  const handleCreateTag = async () => {
    if (!formData.name.trim()) return;

    try {
      const tagData: CreateTagRequest = {
        name: formData.name,
        description: formData.description,
        color: formData.color,
        is_active: formData.is_active
      };

      await createTag(tagData);
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Error creating tag:', error);
    }
  };

  const handleEditTag = (tag: TagType) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      description: tag.description || '',
      color: tag.color,
      is_active: tag.is_active
    });
    setShowCreateModal(true);
  };

  const handleUpdateTag = async () => {
    if (!editingTag || !formData.name.trim()) return;

    try {
      const tagData: UpdateTagRequest = {
        name: formData.name,
        description: formData.description,
        color: formData.color,
        is_active: formData.is_active
      };

      await updateTag(editingTag.id.toString(), tagData);
      setShowCreateModal(false);
      setEditingTag(null);
      resetForm();
    } catch (error) {
      console.error('Error updating tag:', error);
    }
  };

  const handleDeleteTag = async (id: string) => {
    try {
      await deleteTag(id);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tag.description && tag.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading && !tags.length) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Cargando etiquetas...</p>
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
                Etiquetas
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Organiza y categoriza tus conversaciones y contactos con etiquetas
              </p>
            </div>
            <button
              onClick={() => {
                setEditingTag(null);
                resetForm();
                setShowCreateModal(true);
              }}
              className="bg-purple-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-600 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Nueva Etiqueta</span>
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
                  <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Conversaciones</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.conversations}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <Users className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Contactos</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.contacts}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar etiquetas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Tags Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTags.map((tag) => (
            <div key={tag.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: tag.color }}
                    ></div>
                    <div className={`w-2 h-2 rounded-full ${tag.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleEditTag(tag)}
                      className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(tag.id.toString())}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {tag.name}
                </h3>

                {tag.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                    {tag.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <MessageSquare className="w-3 h-3" />
                      <span>{tag.conversation_count || 0}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>{tag.contact_count || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTags.length === 0 && (
          <div className="text-center py-12">
            <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No hay etiquetas
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchQuery 
                ? 'No se encontraron etiquetas con el término de búsqueda'
                : 'Crea tu primera etiqueta para comenzar a organizar tus conversaciones'
              }
            </p>
            {!searchQuery && (
              <button
                onClick={() => {
                  setEditingTag(null);
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="bg-purple-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-600 transition-colors"
              >
                Crear Primera Etiqueta
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-surface rounded-2xl p-8 max-w-md w-full border border-gray-200/50 dark:border-dark-border/50">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingTag ? 'Editar Etiqueta' : 'Crear Nueva Etiqueta'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTag(null);
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
                  Nombre de la Etiqueta
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ej: Cliente VIP"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Describe el propósito de esta etiqueta..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        formData.color === color.value
                          ? 'border-gray-900 dark:border-white scale-110'
                          : 'border-gray-200 dark:border-gray-600 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                </div>
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
                  Etiqueta Activa
                </label>
              </div>
            </div>

            <div className="flex space-x-3 pt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTag(null);
                  resetForm();
                }}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={editingTag ? handleUpdateTag : handleCreateTag}
                className="flex-1 bg-purple-500 text-white px-4 py-3 rounded-xl font-medium hover:bg-purple-600 transition-colors flex items-center justify-center space-x-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{editingTag ? 'Actualizar' : 'Crear'} Etiqueta</span>
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
                ¿Eliminar etiqueta?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Esta acción no se puede deshacer. La etiqueta será eliminada permanentemente y se desasignará de todas las conversaciones y contactos.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteTag(showDeleteConfirm)}
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

export default TagsPage;
