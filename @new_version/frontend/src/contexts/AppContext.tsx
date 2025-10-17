import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api.service';
import { User, Tenant, LoginRequest, RegisterRequest, AppContextType } from '../types';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp debe ser usado dentro de un AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!tenant;

  // Cargar usuario y tenant al inicializar
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          apiService.setToken(token);
          // Comentar temporalmente la llamada a getProfile para debug
          // const response = await apiService.getProfile();
          // if (response.success && response.data) {
          //   setUser(response.data.user);
          //   setTenant(response.data.tenant);
          // }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
        setTenant(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      setIsLoading(true);
      const response = await apiService.login(credentials);
      
      if (response.success && response.data) {
        const { user: userData, tenant: tenantData, access_token, refresh_token } = response.data;
        
        // Guardar tokens
        localStorage.setItem('accessToken', access_token);
        localStorage.setItem('refreshToken', refresh_token);
        
        // Configurar token en el servicio
        apiService.setToken(access_token);
        
        // Actualizar estado
        setUser(userData);
        setTenant(tenantData);
      } else {
        throw new Error(response.message || 'Error al iniciar sesión');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      setIsLoading(true);
      const response = await apiService.register(data);
      
      if (response.success && response.data) {
        const { user: userData, tenant: tenantData, access_token, refresh_token } = response.data;
        
        // Guardar tokens
        localStorage.setItem('accessToken', access_token);
        localStorage.setItem('refreshToken', refresh_token);
        
        // Configurar token en el servicio
        apiService.setToken(access_token);
        
        // Actualizar estado
        setUser(userData);
        setTenant(tenantData);
      } else {
        throw new Error(response.message || 'Error al registrarse');
      }
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (user) {
        await apiService.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Limpiar estado local
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      apiService.setToken(null);
      setUser(null);
      setTenant(null);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const updateTenant = (tenantData: Partial<Tenant>) => {
    if (tenant) {
      setTenant({ ...tenant, ...tenantData });
    }
  };

  const refreshToken = async () => {
    try {
      const refreshTokenValue = localStorage.getItem('refreshToken');
      if (!refreshTokenValue) {
        throw new Error('No refresh token available');
      }

      const response = await apiService.refreshToken(refreshTokenValue);
      
      if (response.success && response.data) {
        const { access_token } = response.data;
        localStorage.setItem('accessToken', access_token);
        apiService.setToken(access_token);
      } else {
        throw new Error('Failed to refresh token');
      }
    } catch (error) {
      console.error('Refresh token error:', error);
      // Si falla el refresh, hacer logout
      await logout();
      throw error;
    }
  };

  const value: AppContextType = {
    user,
    tenant,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
    updateUser,
    updateTenant
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};