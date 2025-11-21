import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, Image, Video, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useNotificationHelpers } from './NotificationSystem';

interface MediaFile {
  id: number;
  original_name: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  mime_type: string;
  width?: number;
  height?: number;
  duration?: number;
  thumbnail_path?: string;
  is_compressed: boolean;
  compression_ratio?: number;
  created_at: string;
  updated_at: string;
}

interface MediaUploadProps {
  onUploadComplete?: (files: MediaFile[]) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  maxSize?: number; // en MB
  className?: string;
}

const MediaUpload: React.FC<MediaUploadProps> = ({
  onUploadComplete,
  onUploadError,
  maxFiles = 10,
  acceptedTypes = ['image/*', 'video/*', 'application/pdf', 'text/plain'],
  maxSize = 50,
  className = ''
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<MediaFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showError } = useNotificationHelpers();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (mimeType.startsWith('video/')) return <Video className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  const validateFile = (file: File): string | null => {
    // Verificar tamaño
    if (file.size > maxSize * 1024 * 1024) {
      return `El archivo ${file.name} es demasiado grande. Tamaño máximo: ${maxSize}MB`;
    }

    // Verificar tipo
    const isValidType = acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    if (!isValidType) {
      return `Tipo de archivo no permitido: ${file.type}`;
    }

    return null;
  };

  const uploadFile = async (file: File): Promise<MediaFile> => {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const response = await fetch('/api/media/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al subir archivo');
    }

    const result = await response.json();
    return result.data;
  };

  const handleFiles = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);
    
    // Validar número máximo de archivos
    if (uploadedFiles.length + fileArray.length > maxFiles) {
      showError('Error', `Solo se pueden subir máximo ${maxFiles} archivos`);
      return;
    }

    // Validar archivos
    const validationErrors: string[] = [];
    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) validationErrors.push(error);
    });

    if (validationErrors.length > 0) {
      showError('Error de validación', validationErrors.join('\n'));
      return;
    }

    setUploading(true);
    const newFiles: MediaFile[] = [];

    try {
      for (const file of fileArray) {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        
        try {
          const uploadedFile = await uploadFile(file);
          newFiles.push(uploadedFile);
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        } catch (error) {
          console.error(`Error subiendo ${file.name}:`, error);
          showError('Error', `Error al subir ${file.name}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

      if (newFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...newFiles]);
        showSuccess('Archivos subidos', `${newFiles.length} archivo(s) subido(s) exitosamente`);
        onUploadComplete?.(newFiles);
      }
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  }, [uploadedFiles.length, maxFiles, showSuccess, showError, onUploadComplete]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFiles]);

  const removeFile = useCallback((fileId: number) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Zona de Drop */}
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer
          ${isDragOver 
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500'
          }
          ${uploading ? 'pointer-events-none opacity-50' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          className="hidden"
        />
        
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
            {uploading ? (
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-purple-500" />
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {uploading ? 'Subiendo archivos...' : 'Arrastra archivos aquí'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              o haz clic para seleccionar archivos
            </p>
          </div>
          
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <p>Tipos permitidos: Imágenes, Videos, PDF, Texto</p>
            <p>Tamaño máximo: {maxSize}MB por archivo</p>
            <p>Máximo {maxFiles} archivos</p>
          </div>
        </div>
      </div>

      {/* Lista de archivos subidos */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Archivos subidos ({uploadedFiles.length})
          </h4>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-purple-500">
                    {getFileIcon(file.mime_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.original_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.file_size)}
                      {file.is_compressed && (
                        <span className="ml-2 text-green-600 dark:text-green-400">
                          • Comprimido ({Math.round((file.compression_ratio || 1) * 100)}%)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progreso de subida */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Subiendo archivos...
          </h4>
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} className="space-y-1">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span className="truncate">{fileName}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaUpload;
