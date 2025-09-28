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
import { useTags, useTagStats } from '../../hooks/useTags';
import { Tag as TagType, CreateTagRequest, UpdateTagRequest } from '../../services/api.service';

const TagsPage: React.FC = () => {
  const {
    tags,
    loading,
    error,
    createTag,
    updateTag,
    deleteTag
  } = useTags();
  
  const {
    stats: tagStats,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats
  } = useTagStats();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTag, setEditingTag] = useState<TagType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

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
    { value: '#6366F1', label: 'Índigo', class: 'bg-indigo-500' }
  ];


  // Filtrar etiquetas
  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tag.description && tag.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      is_active: true
    });
  };

  const handleCreateTag = async () => {
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
      refetchStats();
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
    if (!editingTag) return;

    try {
      const updateData: UpdateTagRequest = {
        name: formData.name,
        description: formData.description,
        color: formData.color,
        is_active: formData.is_active
      };

      await updateTag(editingTag.id.toString(), updateData);
      setShowCreateModal(false);
      setEditingTag(null);
      resetForm();
      refetchStats();
    } catch (error) {
      console.error('Error updating tag:', error);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      await deleteTag(tagId);
      setShowDeleteConfirm(null);
      refetchStats();
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-bg dark:via-dark-surface dark:to-dark-card flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Cargando etiquetas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-dark-bg dark:via-dark-surface dark:to-dark-card flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">Error al cargar las etiquetas</p>
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
                Etiquetas
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Organiza y categoriza tus conversaciones y contactos con etiquetas
              </p>
            </div>
            <button
              onClick={() => {
                setEditingTag(null);
                resetForm();
                setShowCreateModal(true);
              }}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              <span>Nueva Etiqueta</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Stats Cards */}
        {tagStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-dark-border/50 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-xl">
                  <Tag className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Etiquetas</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{tagStats.total_tags}</p>
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
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{tagStats.active_tags}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-dark-border/50 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">En Contactos</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{Object.keys(tagStats.tags_by_contact || {}).length}</p>
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
                  placeholder="Buscar etiquetas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tags List */}
        <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-sm border border-gray-200 dark:border-dark-border overflow-hidden">
          {filteredTags.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No se encontraron etiquetas
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery ? 'No hay etiquetas que coincidan con tu búsqueda' : 'No hay etiquetas disponibles'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
              {filteredTags.map((tag) => (
                <div key={tag.id} className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <h3 className="font-medium text-gray-900 dark:text-white">{tag.name}</h3>
                      </div>
                      <div className="relative group">
                        <button className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-dark-surface rounded-lg shadow-lg border border-gray-200 dark:border-dark-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                          <div className="py-1">
                            <button
                              onClick={() => handleEditTag(tag)}
                              className="w-full px-4 py-2 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center space-x-2"
                            >
                              <Edit className="w-4 h-4" />
                              <span>Editar</span>
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(tag.id.toString())}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    {tag.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{tag.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        tag.is_active 
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400'
                      }`}>
                        {tag.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
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
                  placeholder="Nombre de la etiqueta"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white"
                  placeholder="Descripción de la etiqueta"
                  rows={3}
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
                      className={`w-8 h-8 rounded-lg border-2 ${
                        formData.color === color.value 
                          ? 'border-gray-900 dark:border-white' 
                          : 'border-gray-200 dark:border-gray-600'
                      }`}
                      style={{ backgroundColor: color.value }}
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
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Etiqueta activa
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTag(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={editingTag ? handleUpdateTag : handleCreateTag}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
              >
                {editingTag ? 'Actualizar' : 'Crear'}
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
                  Eliminar Etiqueta
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Esta acción no se puede deshacer
                </p>
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              ¿Estás seguro de que quieres eliminar esta etiqueta? Se eliminará de todas las conversaciones y contactos asociados.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteTag(showDeleteConfirm)}
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

export default TagsPage;