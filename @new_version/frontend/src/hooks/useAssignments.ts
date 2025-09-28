import { useState, useEffect, useCallback } from 'react';
import { apiService, Assignment, AssignmentStats } from '../services/api.service';

export const useAssignments = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getUserAssignments();
      if (response.success && response.data) {
        setAssignments(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar asignaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  const assignAssistant = useCallback(async (data: {
    assistant_id: number;
    conversation_id: string;
    platform: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.assignAssistant(data);
      if (response.success && response.data) {
        setAssignments(prev => [...prev, response.data!]);
        return response.data;
      }
      throw new Error(response.message || 'Error al asignar asistente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar asistente');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const unassignAssistant = useCallback(async (conversationId: string, platform: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.unassignAssistant(conversationId, platform);
      if (response.success) {
        setAssignments(prev => 
          prev.filter(assignment => 
            !(assignment.conversation_id === conversationId && assignment.platform === platform)
          )
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al desasignar asistente');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const autoAssignAssistant = useCallback(async (data: {
    conversation_id: string;
    platform: string;
    contact_id?: number;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.autoAssignAssistant(data);
      if (response.success && response.data) {
        setAssignments(prev => [...prev, response.data!]);
        return response.data;
      }
      throw new Error(response.message || 'Error en asignación automática');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en asignación automática');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  return {
    assignments,
    loading,
    error,
    assignAssistant,
    unassignAssistant,
    autoAssignAssistant,
    refetch: fetchAssignments
  };
};

export const useAssignmentStats = () => {
  const [stats, setStats] = useState<AssignmentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getAssignmentStats();
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

export const useAssignedAssistant = (conversationId: string, platform: string) => {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignment = useCallback(async () => {
    if (!conversationId || !platform) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getAssignedAssistant(conversationId, platform);
      if (response.success && response.data) {
        setAssignment(response.data);
      } else {
        setAssignment(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar asignación');
      setAssignment(null);
    } finally {
      setLoading(false);
    }
  }, [conversationId, platform]);

  useEffect(() => {
    fetchAssignment();
  }, [fetchAssignment]);

  return {
    assignment,
    loading,
    error,
    refetch: fetchAssignment
  };
};
