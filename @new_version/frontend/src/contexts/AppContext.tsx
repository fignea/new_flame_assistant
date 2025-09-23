import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api.service';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
}

interface AppContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshToken: () => Promise<void>;
}

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
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Cargar usuario al inicializar
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          apiService.setToken(token);
          const response = await apiService.getProfile();
          if (response.success && response.data) {
            setUser(response.data);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await apiService.login({ email, password });
      
      if (response.success && response.data) {
        const { user: userData, accessToken, refreshToken } = response.data;
        
        // Guardar tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        // Configurar token en el servicio
        apiService.setToken(accessToken);
        
        // Actualizar estado
        setUser(userData);
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

  const register = async (name: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await apiService.register({ name, email, password });
      
      if (response.success && response.data) {
        const { user: userData, accessToken, refreshToken } = response.data;
        
        // Guardar tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        // Configurar token en el servicio
        apiService.setToken(accessToken);
        
        // Actualizar estado
        setUser(userData);
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
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      setIsLoading(true);
      const response = await apiService.updateProfile(data);
      
      if (response.success && response.data) {
        const { user: userData, accessToken, refreshToken } = response.data;
        
        // Actualizar tokens si se proporcionaron nuevos
        if (accessToken) {
          localStorage.setItem('accessToken', accessToken);
          apiService.setToken(accessToken);
        }
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
        
        // Actualizar estado
        setUser(userData);
      } else {
        throw new Error(response.message || 'Error al actualizar perfil');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    } finally {
      setIsLoading(false);
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
        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);
        apiService.setToken(accessToken);
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
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    refreshToken
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
