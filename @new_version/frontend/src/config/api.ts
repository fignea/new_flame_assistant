// Configuración de la API
const API_BASE_URL = 'http://localhost:3001';
const WS_BASE_URL = 'ws://localhost:3001';

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
    conversations: {
      list: '/api/conversations',
      create: '/api/conversations',
      get: (id: string) => `/api/conversations/${id}`,
      update: (id: string) => `/api/conversations/${id}`,
      delete: (id: string) => `/api/conversations/${id}`,
      messages: (id: string) => `/api/conversations/${id}/messages`,
      sendMessage: (id: string) => `/api/conversations/${id}/messages`,
      markRead: (id: string) => `/api/conversations/${id}/mark-read`,
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
      train: (id: string) => `/api/assistants/${id}/train`,
      stats: (id: string) => `/api/assistants/${id}/stats`,
      schedules: (id: string) => `/api/assistants/${id}/schedules`,
      createSchedule: (id: string) => `/api/assistants/${id}/schedules`,
      updateSchedule: (id: string, scheduleId: string) => `/api/assistants/${id}/schedules/${scheduleId}`,
      deleteSchedule: (id: string, scheduleId: string) => `/api/assistants/${id}/schedules/${scheduleId}`,
      search: '/api/assistants/search'
    },
    integrations: {
      list: '/api/integrations',
      whatsapp: {
        createSession: '/api/integrations/whatsapp/session',
        getQR: '/api/integrations/whatsapp/qr',
        getStatus: '/api/integrations/whatsapp/status',
        disconnect: '/api/integrations/whatsapp/disconnect',
        sendMessage: '/api/integrations/whatsapp/send',
        getChats: '/api/integrations/whatsapp/chats',
        getMessages: (chatId: string) => `/api/integrations/whatsapp/chats/${chatId}/messages`
      }
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
