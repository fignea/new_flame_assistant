import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';

export interface Organization {
  id: number;
  name: string;
  slug: string;
  description?: string;
  settings: Record<string, any>;
  plan: 'free' | 'pro' | 'enterprise';
  max_users: number;
  max_whatsapp_sessions: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  role?: string;
  joined_at?: string;
}

export interface OrganizationStats {
  total_users: number;
  total_whatsapp_sessions: number;
  total_contacts: number;
  total_messages: number;
  total_assistants: number;
  total_web_conversations: number;
  active_whatsapp_sessions: number;
  online_visitors: number;
}

export interface OrganizationWithStats extends Organization {
  stats: OrganizationStats;
  user_count: number;
}

interface OrganizationContextType {
  organizations: Organization[];
  currentOrganization: Organization | null;
  isLoading: boolean;
  error: string | null;
  switchOrganization: (organizationId: number) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
  createOrganization: (data: CreateOrganizationRequest) => Promise<Organization>;
  updateOrganization: (id: number, data: UpdateOrganizationRequest) => Promise<Organization>;
  inviteUser: (organizationId: number, data: InviteUserRequest) => Promise<void>;
  removeUser: (organizationId: number, userId: number) => Promise<void>;
  updateUserRole: (organizationId: number, userId: number, data: UpdateUserRoleRequest) => Promise<void>;
}

interface CreateOrganizationRequest {
  name: string;
  slug: string;
  description?: string;
  plan?: 'free' | 'pro' | 'enterprise';
}

interface UpdateOrganizationRequest {
  name?: string;
  description?: string;
  settings?: Record<string, any>;
  plan?: 'free' | 'pro' | 'enterprise';
  max_users?: number;
  max_whatsapp_sessions?: number;
  is_active?: boolean;
}

interface InviteUserRequest {
  email: string;
  role: 'admin' | 'member';
  permissions?: Record<string, any>;
}

interface UpdateUserRoleRequest {
  role: 'owner' | 'admin' | 'member';
  permissions?: Record<string, any>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

interface OrganizationProviderProps {
  children: ReactNode;
}

export const OrganizationProvider: React.FC<OrganizationProviderProps> = ({ children }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar organizaciones del usuario
  const loadOrganizations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.get('/organizations');
      
      if (response.data.success) {
        const orgs = response.data.data;
        setOrganizations(orgs);
        
        // Si no hay organización actual, usar la primera
        if (!currentOrganization && orgs.length > 0) {
          setCurrentOrganization(orgs[0]);
        }
      } else {
        setError(response.data.message || 'Error al cargar organizaciones');
      }
    } catch (err: any) {
      console.error('Error loading organizations:', err);
      setError(err.response?.data?.message || 'Error al cargar organizaciones');
    } finally {
      setIsLoading(false);
    }
  };

  // Cambiar organización actual
  const switchOrganization = async (organizationId: number) => {
    try {
      const organization = organizations.find(org => org.id === organizationId);
      if (organization) {
        setCurrentOrganization(organization);
        
        // Guardar en localStorage
        localStorage.setItem('currentOrganizationId', organizationId.toString());
        
        // Recargar la página para actualizar el contexto de la aplicación
        window.location.reload();
      }
    } catch (err: any) {
      console.error('Error switching organization:', err);
      setError('Error al cambiar de organización');
    }
  };

  // Refrescar organizaciones
  const refreshOrganizations = async () => {
    await loadOrganizations();
  };

  // Crear nueva organización
  const createOrganization = async (data: CreateOrganizationRequest): Promise<Organization> => {
    try {
      const response = await api.post('/organizations', data);
      
      if (response.data.success) {
        const newOrg = response.data.data;
        setOrganizations(prev => [...prev, newOrg]);
        return newOrg;
      } else {
        throw new Error(response.data.message || 'Error al crear organización');
      }
    } catch (err: any) {
      console.error('Error creating organization:', err);
      throw new Error(err.response?.data?.message || 'Error al crear organización');
    }
  };

  // Actualizar organización
  const updateOrganization = async (id: number, data: UpdateOrganizationRequest): Promise<Organization> => {
    try {
      const response = await api.put(`/organizations/${id}`, data);
      
      if (response.data.success) {
        const updatedOrg = response.data.data;
        setOrganizations(prev => 
          prev.map(org => org.id === id ? updatedOrg : org)
        );
        
        if (currentOrganization?.id === id) {
          setCurrentOrganization(updatedOrg);
        }
        
        return updatedOrg;
      } else {
        throw new Error(response.data.message || 'Error al actualizar organización');
      }
    } catch (err: any) {
      console.error('Error updating organization:', err);
      throw new Error(err.response?.data?.message || 'Error al actualizar organización');
    }
  };

  // Invitar usuario
  const inviteUser = async (organizationId: number, data: InviteUserRequest): Promise<void> => {
    try {
      const response = await api.post(`/organizations/${organizationId}/invite`, data);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Error al invitar usuario');
      }
    } catch (err: any) {
      console.error('Error inviting user:', err);
      throw new Error(err.response?.data?.message || 'Error al invitar usuario');
    }
  };

  // Eliminar usuario
  const removeUser = async (organizationId: number, userId: number): Promise<void> => {
    try {
      const response = await api.delete(`/organizations/${organizationId}/users/${userId}`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Error al eliminar usuario');
      }
    } catch (err: any) {
      console.error('Error removing user:', err);
      throw new Error(err.response?.data?.message || 'Error al eliminar usuario');
    }
  };

  // Actualizar rol de usuario
  const updateUserRole = async (organizationId: number, userId: number, data: UpdateUserRoleRequest): Promise<void> => {
    try {
      const response = await api.put(`/organizations/${organizationId}/users/${userId}/role`, data);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Error al actualizar rol');
      }
    } catch (err: any) {
      console.error('Error updating user role:', err);
      throw new Error(err.response?.data?.message || 'Error al actualizar rol');
    }
  };

  // Cargar organización guardada en localStorage al inicializar
  useEffect(() => {
    const savedOrgId = localStorage.getItem('currentOrganizationId');
    if (savedOrgId) {
      const orgId = parseInt(savedOrgId);
      const savedOrg = organizations.find(org => org.id === orgId);
      if (savedOrg) {
        setCurrentOrganization(savedOrg);
      }
    }
  }, [organizations]);

  // Cargar organizaciones al montar el componente
  useEffect(() => {
    loadOrganizations();
  }, []);

  const value: OrganizationContextType = {
    organizations,
    currentOrganization,
    isLoading,
    error,
    switchOrganization,
    refreshOrganizations,
    createOrganization,
    updateOrganization,
    inviteUser,
    removeUser,
    updateUserRole
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};
