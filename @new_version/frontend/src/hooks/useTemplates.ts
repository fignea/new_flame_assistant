import { useState, useEffect, useCallback } from 'react';
import { apiService, ResponseTemplate, TemplateStats } from '../services/api.service';

export const useTemplates = (params?: {
  assistant_id?: number;
  category?: string;
}) => {
  const [templates, setTemplates] = useState<ResponseTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getTemplates(params);
      if (response.success && response.data) {
        setTemplates(response.data.data || response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar plantillas');
    } finally {
      setLoading(false);
    }
  }, [params?.assistant_id, params?.category]);

  const createTemplate = useCallback(async (data: {
    name: string;
    content: string;
    assistant_id: number;
    category?: 'greeting' | 'farewell' | 'question' | 'information' | 'escalation' | 'general';
    trigger_keywords?: string[];
    priority?: number;
    response_delay?: number;
    is_active?: boolean;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.createTemplate(data);
      if (response.success && response.data) {
        setTemplates(prev => [...prev, response.data!]);
        return response.data;
      }
      throw new Error(response.message || 'Error al crear plantilla');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear plantilla');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTemplate = useCallback(async (id: string, data: Partial<ResponseTemplate>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.updateTemplate(id, data);
      if (response.success && response.data) {
        setTemplates(prev => 
          prev.map(template => 
            template.id === parseInt(id) ? response.data! : template
          )
        );
        return response.data;
      }
      throw new Error(response.message || 'Error al actualizar plantilla');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar plantilla');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.deleteTemplate(id);
      if (response.success) {
        setTemplates(prev => prev.filter(template => template.id !== parseInt(id)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar plantilla');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const duplicateTemplate = useCallback(async (id: string, newName: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.duplicateTemplate(id, newName);
      if (response.success && response.data) {
        setTemplates(prev => [...prev, response.data!]);
        return response.data;
      }
      throw new Error(response.message || 'Error al duplicar plantilla');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al duplicar plantilla');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchTemplates = useCallback(async (keywords: string[], assistantId?: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.searchTemplatesByKeywords({
        keywords,
        assistant_id: assistantId
      });
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar plantillas');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    searchTemplates,
    refetch: fetchTemplates
  };
};

export const useTemplateStats = () => {
  const [stats, setStats] = useState<TemplateStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getTemplateStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
};

export const useTemplate = (id: string) => {
  const [template, setTemplate] = useState<ResponseTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplate = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getTemplateById(id);
      if (response.success && response.data) {
        setTemplate(response.data);
      } else {
        setTemplate(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar plantilla');
      setTemplate(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  return {
    template,
    loading,
    error,
    refetch: fetchTemplate
  };
};
