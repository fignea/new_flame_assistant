// Configuración de la API
// Detectar si estamos en producción o desarrollo
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Función para obtener la URL base del API
const getApiBaseUrl = () => {
  // Si hay una variable de entorno definida, usarla
  if (process.env.VITE_API_URL) {
    return process.env.VITE_API_URL;
  }
  
  // En producción, usar rutas relativas (Nginx proxy maneja la redirección)
  if (isProduction) {
    return ''; // Usar rutas relativas, Nginx redirige /api/ al backend
  }
  
  // En desarrollo, usar localhost
  return 'http://localhost:3001';
};

// URLs base según el entorno
const API_BASE_URL = getApiBaseUrl();

// WebSocket URL - en producción usar el mismo dominio, en desarrollo localhost
const WS_BASE_URL = isProduction 
  ? window.location.origin  // En producción, usar el mismo dominio
  : 'http://localhost:3001'; // En desarrollo, usar localhost

export const apiConfig = {
  baseURL: API_BASE_URL,
  wsURL: WS_BASE_URL,
  endpoints: {
    auth: {
      login: '/api/auth/login',
      register: '/api/auth/register',
      refresh: '/api/auth/refresh-token',
      logout: '/api/auth/logout',
      profile: '/api/auth/profile',
      me: '/api/auth/me',
      forgotPassword: '/api/auth/forgot-password',
      resetPassword: '/api/auth/reset-password'
    },
    tenants: {
      list: '/api/tenants',
      get: (id: string) => `/api/tenants/${id}`,
      getBySlug: (slug: string) => `/api/tenants/slug/${slug}`,
      create: '/api/tenants',
      update: (id: string) => `/api/tenants/${id}`,
      delete: (id: string) => `/api/tenants/${id}`
    },
    users: {
      list: '/api/users',
      get: (id: string) => `/api/users/${id}`,
      create: '/api/users',
      update: (id: string) => `/api/users/${id}`,
      delete: (id: string) => `/api/users/${id}`
    },
    contacts: {
      list: '/api/contacts',
      get: (id: string) => `/api/contacts/${id}`,
      create: '/api/contacts',
      update: (id: string) => `/api/contacts/${id}`,
      delete: (id: string) => `/api/contacts/${id}`,
      search: '/api/contacts/search',
      block: (id: string) => `/api/contacts/${id}/block`,
      unblock: (id: string) => `/api/contacts/${id}/unblock`
    },
    conversations: {
      list: '/api/conversations',
      create: '/api/conversations',
      get: (id: string) => `/api/conversations/${id}`,
      update: (id: string) => `/api/conversations/${id}`,
      delete: (id: string) => `/api/conversations/${id}`,
      messages: (id: string) => `/api/conversations/${id}/messages`,
      sendMessage: (id: string) => `/api/conversations/${id}/messages`,
      markRead: (id: string) => `/api/conversations/${id}/read`,
      stats: (id: string) => `/api/conversations/${id}/stats`,
      search: '/api/conversations/search',
      unreadCount: '/api/conversations/unread-count',
      bulkUpdate: '/api/conversations/bulk-update'
    },
    assistants: {
      list: '/api/assistants',
      create: '/api/assistants',
      get: (id: string) => `/api/assistants/${id}`,
      update: (id: string) => `/api/assistants/${id}`,
      delete: (id: string) => `/api/assistants/${id}`,
      test: (id: string) => `/api/assistants/${id}/test`,
      stats: (id: string) => `/api/assistants/${id}/stats`,
      search: '/api/assistants/search'
    },
    templates: {
      list: '/api/templates',
      create: '/api/templates',
      get: (id: string) => `/api/templates/${id}`,
      update: (id: string) => `/api/templates/${id}`,
      delete: (id: string) => `/api/templates/${id}`,
      search: '/api/templates/search'
    },
    tags: {
      list: '/api/tags',
      create: '/api/tags',
      get: (id: string) => `/api/tags/${id}`,
      update: (id: string) => `/api/tags/${id}`,
      delete: (id: string) => `/api/tags/${id}`,
      conversations: (id: string) => `/api/tags/${id}/conversations`,
      contacts: (id: string) => `/api/tags/${id}/contacts`,
      tagConversation: (id: string) => `/api/tags/${id}/conversations`,
      untagConversation: (id: string) => `/api/tags/${id}/conversations`,
      tagContact: (id: string) => `/api/tags/${id}/contacts`,
      untagContact: (id: string) => `/api/tags/${id}/contacts`
    },
    scheduledMessages: {
      list: '/api/scheduled-messages',
      create: '/api/scheduled-messages',
      get: (id: string) => `/api/scheduled-messages/${id}`,
      update: (id: string) => `/api/scheduled-messages/${id}`,
      delete: (id: string) => `/api/scheduled-messages/${id}`,
      cancel: (id: string) => `/api/scheduled-messages/${id}/cancel`
    },
    dashboard: {
      stats: '/api/dashboard/stats',
      recentActivity: '/api/dashboard/recent-activity',
      performance: '/api/dashboard/performance',
      tenantInfo: '/api/dashboard/tenant-info'
    },
    integrations: {
      list: '/api/integrations',
      create: '/api/integrations',
      update: (id: string) => `/api/integrations/${id}`,
      delete: (id: string) => `/api/integrations/${id}`,
      whatsapp: {
        createSession: '/api/whatsapp/sessions',
        getQR: '/api/whatsapp/qr',
        getStatus: '/api/whatsapp/status',
        disconnect: '/api/whatsapp/disconnect',
        sendMessage: '/api/whatsapp/send',
        getChats: '/api/whatsapp/chats',
        getMessages: (chatId: string) => `/api/whatsapp/chats/${chatId}/messages`
      }
    },
    assignments: {
      list: '/api/assignments',
      create: '/api/assignments',
      get: (conversationId: string, platform: string) => `/api/assignments/conversations/${conversationId}/${platform}`,
      delete: (conversationId: string, platform: string) => `/api/assignments/conversations/${conversationId}/${platform}`
    },
    autoResponse: {
      process: '/api/auto-response/process',
      send: '/api/auto-response/send',
      shouldRespond: (conversationId: string, platform: string) => `/api/auto-response/should-respond/${conversationId}/${platform}`
    },
    media: {
      upload: '/api/media/upload',
      get: (id: string) => `/api/media/${id}`,
      delete: (id: string) => `/api/media/${id}`
    },
    config: {
      systemInfo: '/api/config/system-info',
      databaseStatus: '/api/config/database-status',
      changePassword: '/api/config/change-password'
    },
    analytics: {
      dashboard: '/api/analytics/dashboard',
      conversations: '/api/analytics/conversations',
      assistants: '/api/analytics/assistants',
      responseTime: '/api/analytics/response-time',
      satisfaction: '/api/analytics/satisfaction'
    }
  }
};

// Configuración de headers por defecto
export const defaultHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

// Función para obtener headers con autenticación
export const getAuthHeaders = (token: string) => ({
  ...defaultHeaders,
  'Authorization': `Bearer ${token}`
});

// Función para construir URL completa
export const buildURL = (endpoint: string) => `${API_BASE_URL}${endpoint}`;

// Configuración de WebSocket
export const wsConfig = {
  url: WS_BASE_URL,
  options: {
    transports: ['websocket', 'polling'],
    upgrade: true,
    rememberUpgrade: true
  }
};

export default apiConfig;