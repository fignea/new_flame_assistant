import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Search, 
  Filter, 
  Grid, 
  List, 
  Trash2, 
  Download, 
  Eye,
  Image,
  Video,
  FileText,
  BarChart3,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react';
import { useMedia, useMediaStats, MediaFile } from '../../hooks/useMedia';
import MediaUpload from '../../components/MediaUpload';
import MediaPreview from '../../components/MediaPreview';
import { useNotificationHelpers } from '../../components/NotificationSystem';

const MediaPage: React.FC = () => {
  const {
    mediaFiles,
    loading,
    error,
    getMediaFiles,
    deleteMediaFile
  } = useMedia();
  
  const {
    stats: mediaStats,
    loading: statsLoading,
    error: statsError,
    fetchStats
  } = useMediaStats();

  const { showSuccess, showError } = useNotificationHelpers();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    getMediaFiles(selectedType || undefined);
    fetchStats();
  }, [getMediaFiles, fetchStats, selectedType]);

  const filteredFiles = mediaFiles.filter(file =>
    file.original_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.file_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteFile = async (id: number) => {
    try {
      const success = await deleteMediaFile(id);
      if (success) {
        showSuccess('Archivo eliminado', 'El archivo multimedia ha sido eliminado exitosamente');
        fetchStats(); // Actualizar estadísticas
      } else {
        showError('Error', 'No se pudo eliminar el archivo multimedia');
      }
    } catch (err) {
      showError('Error', 'Error al eliminar el archivo multimedia');
    } finally {
      setShowDeleteConfirm(null);
    }
  };

  const handleUploadComplete = (files: MediaFile[]) => {
    showSuccess('Archivos subidos', `${files.length} archivo(s) subido(s) exitosamente`);
    setShowUploadModal(false);
    getMediaFiles(selectedType || undefined); // Recargar lista
    fetchStats(); // Actualizar estadísticas
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <Image className="w-5 h-5 text-blue-500" />;
      case 'video':
        return <Video className="w-5 h-5 text-purple-500" />;
      case 'audio':
        return <FileText className="w-5 h-5 text-green-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getFileUrl = (file: MediaFile): string => {
    return `/api/media/${file.id}/file`;
  };

  const getThumbnailUrl = (file: MediaFile): string => {
    return `/api/media/${file.id}/thumbnail`;
  };

  if (loading || statsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Cargando archivos multimedia...</span>
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
                Archivos Multimedia
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Gestiona tus archivos multimedia: imágenes, videos, documentos y más
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
              >
                <Upload className="w-5 h-5" />
                <span>Subir Archivos</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Stats Cards */}
        {mediaStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-dark-border/50 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-xl">
                  <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Archivos</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{mediaStats.total_files}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-dark-border/50 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
                  <Image className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Imágenes</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{mediaStats.files_by_type.image || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-dark-border/50 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-xl">
                  <Video className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Videos</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{mediaStats.files_by_type.video || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-dark-border/50 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl">
                  <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tamaño Total</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatFileSize(mediaStats.total_size)}</p>
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
                  placeholder="Buscar archivos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            {/* Type Filter */}
            <div className="sm:w-48">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-dark-surface text-gray-900 dark:text-white"
              >
                <option value="">Todos los tipos</option>
                <option value="image">Imágenes</option>
                <option value="video">Videos</option>
                <option value="audio">Audio</option>
                <option value="document">Documentos</option>
              </select>
            </div>
            
            {/* View Mode */}
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 rounded-xl transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 rounded-xl transition-colors ${
                  viewMode === 'list'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Files Grid/List */}
        {filteredFiles.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Upload className="w-12 h-12 text-purple-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No hay archivos multimedia
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchQuery ? 'No se encontraron archivos que coincidan con tu búsqueda' : 'Sube tu primer archivo multimedia para comenzar'}
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
            >
              Subir Archivos
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
          }>
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className={`bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border hover:shadow-lg transition-shadow ${
                  viewMode === 'list' ? 'flex items-center p-4' : 'p-4'
                }`}
              >
                {viewMode === 'grid' ? (
                  <>
                    {/* Grid View */}
                    <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                      {file.file_type === 'image' ? (
                        <img
                          src={getThumbnailUrl(file)}
                          alt={file.original_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getFileUrl(file);
                          }}
                        />
                      ) : file.file_type === 'video' ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <img
                            src={getThumbnailUrl(file)}
                            alt={file.original_name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <Video className="w-8 h-8 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          {getFileIcon(file.file_type)}
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {file.file_type}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {file.original_name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.file_size)}
                      </p>
                      {file.is_compressed && (
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Comprimido ({Math.round((file.compression_ratio || 1) * 100)}%)
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setPreviewFile(file)}
                          className="p-2 text-gray-400 hover:text-purple-500 transition-colors"
                          title="Vista previa"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={getFileUrl(file)}
                          download={file.original_name}
                          className="p-2 text-gray-400 hover:text-green-500 transition-colors"
                          title="Descargar"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                      <button
                        onClick={() => setShowDeleteConfirm(file.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* List View */}
                    <div className="flex-shrink-0 w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mr-4">
                      {getFileIcon(file.file_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {file.original_name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.file_size)} • {file.file_type}
                        {file.is_compressed && (
                          <span className="ml-2 text-green-600 dark:text-green-400">
                            • Comprimido
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setPreviewFile(file)}
                        className="p-2 text-gray-400 hover:text-purple-500 transition-colors"
                        title="Vista previa"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <a
                        href={getFileUrl(file)}
                        download={file.original_name}
                        className="p-2 text-gray-400 hover:text-green-500 transition-colors"
                        title="Descargar"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => setShowDeleteConfirm(file.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-surface rounded-2xl p-8 max-w-2xl w-full border border-gray-200/50 dark:border-dark-border/50 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Subir Archivos Multimedia
              </h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <MediaUpload
              onUploadComplete={handleUploadComplete}
              maxFiles={10}
              maxSize={50}
            />
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-surface rounded-2xl max-w-4xl w-full border border-gray-200/50 dark:border-dark-border/50 max-h-[90vh] overflow-y-auto">
            <MediaPreview
              file={previewFile}
              onClose={() => setPreviewFile(null)}
              showControls={true}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-surface rounded-2xl p-8 max-w-md w-full border border-gray-200/50 dark:border-dark-border/50">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Confirmar Eliminación</h2>
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              ¿Estás seguro de que quieres eliminar este archivo multimedia? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-5 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-dark-border"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteFile(showDeleteConfirm)}
                className="bg-red-500 text-white px-5 py-3 rounded-xl font-medium hover:bg-red-600 transition-colors shadow-lg hover:shadow-xl"
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

export default MediaPage;
