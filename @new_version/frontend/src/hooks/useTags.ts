import { useState, useEffect, useCallback } from 'react';
import { apiService, Tag, TagStats, Contact, ConversationTag, ContactTag } from '../services/api.service';

export const useTags = (params?: {
  active_only?: boolean;
}) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getTags(params);
      if (response.success && response.data) {
        setTags(response.data.data || response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar etiquetas');
    } finally {
      setLoading(false);
    }
  }, [params?.active_only]);

  const createTag = useCallback(async (data: {
    name: string;
    color: string;
    description?: string;
    is_active?: boolean;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.createTag(data);
      if (response.success && response.data) {
        setTags(prev => [...prev, response.data!]);
        return response.data;
      }
      throw new Error(response.message || 'Error al crear etiqueta');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear etiqueta');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTag = useCallback(async (id: string, data: Partial<Tag>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.updateTag(id, data);
      if (response.success && response.data) {
        setTags(prev => 
          prev.map(tag => 
            tag.id === parseInt(id) ? response.data! : tag
          )
        );
        return response.data;
      }
      throw new Error(response.message || 'Error al actualizar etiqueta');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar etiqueta');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTag = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.deleteTag(id);
      if (response.success) {
        setTags(prev => prev.filter(tag => tag.id !== parseInt(id)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar etiqueta');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  return {
    tags,
    loading,
    error,
    createTag,
    updateTag,
    deleteTag,
    refetch: fetchTags
  };
};

export const useTagStats = () => {
  const [stats, setStats] = useState<TagStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getTagStats();
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

export const useConversationTags = (conversationId: string, platform: string) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    if (!conversationId || !platform) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getConversationTags(conversationId, platform);
      if (response.success && response.data) {
        setTags(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar etiquetas de conversación');
    } finally {
      setLoading(false);
    }
  }, [conversationId, platform]);

  const addTag = useCallback(async (tagId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.tagConversation(tagId, {
        conversation_id: conversationId,
        platform: platform
      });
      if (response.success && response.data) {
        // Refetch tags to get updated list
        await fetchTags();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar etiqueta');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [conversationId, platform, fetchTags]);

  const removeTag = useCallback(async (tagId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.untagConversation(tagId, conversationId, platform);
      if (response.success) {
        setTags(prev => prev.filter(tag => tag.id !== parseInt(tagId)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al remover etiqueta');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [conversationId, platform]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  return {
    tags,
    loading,
    error,
    addTag,
    removeTag,
    refetch: fetchTags
  };
};

export const useContactTags = (contactId: string) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    if (!contactId) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getContactTags(contactId);
      if (response.success && response.data) {
        setTags(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar etiquetas de contacto');
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  const addTag = useCallback(async (tagId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.tagContact(tagId, {
        contact_id: parseInt(contactId)
      });
      if (response.success && response.data) {
        // Refetch tags to get updated list
        await fetchTags();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar etiqueta');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contactId, fetchTags]);

  const removeTag = useCallback(async (tagId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.untagContact(tagId, contactId);
      if (response.success) {
        setTags(prev => prev.filter(tag => tag.id !== parseInt(tagId)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al remover etiqueta');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  return {
    tags,
    loading,
    error,
    addTag,
    removeTag,
    refetch: fetchTags
  };
};
