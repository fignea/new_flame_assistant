import { useState, useCallback } from 'react';
import { apiService } from '../services/api.service';

export interface MediaFile {
  id: number;
  user_id: number;
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

export interface MediaStats {
  total_files: number;
  total_size: number;
  files_by_type: { [key: string]: number };
  size_by_type: { [key: string]: number };
}

export const useMedia = () => {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getMediaFiles = useCallback(async (type?: string, limit: number = 50, offset: number = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());
      
      const response = await apiService.get(`/api/media?${params.toString()}`);
      
      if (response.success && response.data) {
        setMediaFiles(response.data);
      } else {
        throw new Error(response.message || 'Error al obtener archivos multimedia');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error obteniendo archivos multimedia:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getMediaFileById = useCallback(async (id: number): Promise<MediaFile | null> => {
    try {
      setError(null);
      const response = await apiService.get(`/api/media/${id}`);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Error al obtener archivo multimedia');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error obteniendo archivo multimedia:', err);
      return null;
    }
  }, []);

  const deleteMediaFile = useCallback(async (id: number): Promise<boolean> => {
    try {
      setError(null);
      const response = await apiService.delete(`/api/media/${id}`);
      
      if (response.success) {
        setMediaFiles(prev => prev.filter(file => file.id !== id));
        return true;
      } else {
        throw new Error(response.message || 'Error al eliminar archivo multimedia');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error eliminando archivo multimedia:', err);
      return false;
    }
  }, []);

  const uploadMediaFile = useCallback(async (file: File): Promise<MediaFile | null> => {
    try {
      setError(null);
      setLoading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiService.post('/api/media/upload', formData, {
        'Content-Type': 'multipart/form-data'
      });
      
      if (response.success && response.data) {
        setMediaFiles(prev => [response.data, ...prev]);
        return response.data;
      } else {
        throw new Error(response.message || 'Error al subir archivo multimedia');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error subiendo archivo multimedia:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadMultipleMediaFiles = useCallback(async (files: File[]): Promise<MediaFile[]> => {
    const uploadedFiles: MediaFile[] = [];
    
    for (const file of files) {
      const uploadedFile = await uploadMediaFile(file);
      if (uploadedFile) {
        uploadedFiles.push(uploadedFile);
      }
    }
    
    return uploadedFiles;
  }, [uploadMediaFile]);

  return {
    mediaFiles,
    loading,
    error,
    getMediaFiles,
    getMediaFileById,
    deleteMediaFile,
    uploadMediaFile,
    uploadMultipleMediaFiles
  };
};

export const useMediaStats = () => {
  const [stats, setStats] = useState<MediaStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.get('/api/media/stats');
      
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        throw new Error(response.message || 'Error al obtener estadísticas de multimedia');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error obteniendo estadísticas de multimedia:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    stats,
    loading,
    error,
    fetchStats
  };
};
