import { useState, useEffect, useCallback } from 'react';
import { apiService, User } from '../services/api.service';

export const useUsers = (params?: {
  role?: string;
  is_active?: boolean;
  search?: string;
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getUsers(params);
      if (response.success && response.data) {
        setUsers(response.data.data || response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, [params?.role, params?.is_active, params?.search]);

  const createUser = useCallback(async (data: {
    email: string;
    password: string;
    name: string;
    role?: string;
    permissions?: any;
    is_active?: boolean;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.createUser(data);
      if (response.success && response.data) {
        setUsers(prev => [...prev, response.data!]);
        return response.data;
      }
      throw new Error(response.message || 'Error al crear usuario');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear usuario');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (id: string, data: Partial<User>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.updateUser(id, data);
      if (response.success && response.data) {
        setUsers(prev => 
          prev.map(user => 
            user.id === id ? response.data! : user
          )
        );
        return response.data;
      }
      throw new Error(response.message || 'Error al actualizar usuario');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar usuario');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.deleteUser(id);
      if (response.success) {
        setUsers(prev => prev.filter(user => user.id !== id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar usuario');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleActive = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.toggleUserActive(id);
      if (response.success && response.data) {
        setUsers(prev => 
          prev.map(user => 
            user.id === id ? response.data! : user
          )
        );
        return response.data;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar estado del usuario');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const changePassword = useCallback(async (id: string, newPassword: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.changeUserPassword(id, newPassword);
      if (!response.success) {
        throw new Error(response.message || 'Error al cambiar contraseña');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar contraseña');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    createUser,
    updateUser,
    deleteUser,
    toggleActive,
    changePassword,
    refetch: fetchUsers
  };
};

export const useUsersStats = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getUsersStats();
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

