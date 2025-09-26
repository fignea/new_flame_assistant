import { apiConfig, getAuthHeaders, buildURL } from '../config/api';

// Tipos de respuesta de la API
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: any;
}

// Interfaz para Contact
export interface Contact {
  id: number;
  user_id: number;
  whatsapp_id: string;
  name?: string;
  phone_number?: string;
  is_group: boolean;
  is_blocked: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// Interfaz para ScheduledMessage
export interface ScheduledMessage {
  id: number;
  user_id: number;
  contact_id: number;
  content: string;
  message_type: string;
  scheduled_time: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sent_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

// Clase principal del servicio de API
export class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = apiConfig.baseURL;
  }

  // Establecer token de autenticación
  setToken(token: string | null) {
    this.token = token;
  }

  // Obtener headers con autenticación si está disponible
  private getHeaders(): HeadersInit {
    if (this.token) {
      return getAuthHeaders(this.token);
    }
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  // Método genérico para hacer requests
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = buildURL(endpoint);
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Métodos HTTP
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = new URL(buildURL(endpoint));
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, params[key].toString());
        }
      });
    }

    return this.request<T>(url.pathname + url.search, {
      method: 'GET'
    });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE'
    });
  }

  // Métodos específicos para autenticación
  async login(credentials: { email: string; password: string }) {
    return this.post(apiConfig.endpoints.auth.login, credentials);
  }

  async register(userData: { name: string; email: string; password: string }) {
    return this.post(apiConfig.endpoints.auth.register, userData);
  }

  async refreshToken(refreshToken: string) {
    return this.post(apiConfig.endpoints.auth.refresh, { refreshToken });
  }

  async logout() {
    return this.post(apiConfig.endpoints.auth.logout);
  }

  async getProfile() {
    return this.get(apiConfig.endpoints.auth.profile);
  }

  async updateProfile(profileData: any) {
    return this.put(apiConfig.endpoints.auth.profile, profileData);
  }

  async forgotPassword(email: string) {
    return this.post(apiConfig.endpoints.auth.forgotPassword, { email });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.post(apiConfig.endpoints.auth.resetPassword, { token, newPassword });
  }

  // Métodos para conversaciones
  async getConversations(params?: {
    status?: string;
    platform?: string;
    priority?: string;
    assigned_assistant_id?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    return this.get<PaginatedResponse<any>>(apiConfig.endpoints.conversations.list, params);
  }

  async getConversation(id: string) {
    return this.get(apiConfig.endpoints.conversations.get(id));
  }

  async createConversation(conversationData: any) {
    return this.post(apiConfig.endpoints.conversations.create, conversationData);
  }

  async updateConversation(id: string, updateData: any) {
    return this.put(apiConfig.endpoints.conversations.update(id), updateData);
  }

  async deleteConversation(id: string) {
    return this.delete(apiConfig.endpoints.conversations.delete(id));
  }

  async getConversationMessages(conversationId: string, params?: {
    page?: number;
    limit?: number;
    sender?: string;
    type?: string;
  }) {
    return this.get<PaginatedResponse<any>>(
      apiConfig.endpoints.conversations.messages(conversationId),
      params
    );
  }

  async sendConversationMessage(conversationId: string, messageData: {
    content: string;
    type?: string;
    metadata?: any;
  }) {
    return this.post(apiConfig.endpoints.conversations.sendMessage(conversationId), messageData);
  }

  async markConversationAsRead(conversationId: string) {
    return this.put(apiConfig.endpoints.conversations.markRead(conversationId));
  }

  async getUnreadCount() {
    return this.get(apiConfig.endpoints.conversations.unreadCount);
  }

  async searchConversations(query: string, params?: any) {
    return this.get<PaginatedResponse<any>>(apiConfig.endpoints.conversations.search, {
      q: query,
      ...params
    });
  }

  // Métodos para asistentes
  async getAssistants(params?: {
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) {
    return this.get<PaginatedResponse<any>>(apiConfig.endpoints.assistants.list, params);
  }

  async getAssistant(id: string) {
    return this.get(apiConfig.endpoints.assistants.get(id));
  }

  async createAssistant(assistantData: any) {
    return this.post(apiConfig.endpoints.assistants.create, assistantData);
  }

  async updateAssistant(id: string, updateData: any) {
    return this.put(apiConfig.endpoints.assistants.update(id), updateData);
  }

  async deleteAssistant(id: string) {
    return this.delete(apiConfig.endpoints.assistants.delete(id));
  }

  async trainAssistant(id: string, trainingData: any) {
    return this.post(apiConfig.endpoints.assistants.train(id), trainingData);
  }

  async getAssistantStats(id: string) {
    return this.get(apiConfig.endpoints.assistants.stats(id));
  }

  async getSchedules(assistantId: string) {
    return this.get(apiConfig.endpoints.assistants.schedules(assistantId));
  }

  async createSchedule(assistantId: string, scheduleData: any) {
    return this.post(apiConfig.endpoints.assistants.createSchedule(assistantId), scheduleData);
  }

  async updateSchedule(assistantId: string, scheduleId: string, updateData: any) {
    return this.put(
      apiConfig.endpoints.assistants.updateSchedule(assistantId, scheduleId),
      updateData
    );
  }

  async deleteSchedule(assistantId: string, scheduleId: string) {
    return this.delete(apiConfig.endpoints.assistants.deleteSchedule(assistantId, scheduleId));
  }

  async searchAssistants(query: string, params?: any) {
    return this.get<PaginatedResponse<any>>(apiConfig.endpoints.assistants.search, {
      q: query,
      ...params
    });
  }

  // Métodos para integraciones
  async getIntegrations() {
    return this.get(apiConfig.endpoints.integrations.list);
  }

  // WhatsApp Web methods
  async createWhatsAppSession() {
    return this.post(apiConfig.endpoints.integrations.whatsapp.createSession);
  }

  async getWhatsAppQR() {
    return this.get(apiConfig.endpoints.integrations.whatsapp.getQR);
  }

  async getWhatsAppStatus() {
    return this.get(apiConfig.endpoints.integrations.whatsapp.getStatus);
  }

  async disconnectWhatsApp() {
    return this.post(apiConfig.endpoints.integrations.whatsapp.disconnect);
  }

  async sendWhatsAppMessage(to: string, message: string) {
    return this.post(apiConfig.endpoints.integrations.whatsapp.sendMessage, {
      to,
      message
    });
  }

  async getWhatsAppChatsLegacy() {
    return this.get(apiConfig.endpoints.integrations.whatsapp.getChats);
  }

  async getWhatsAppMessagesLegacy(chatId: string, limit?: number) {
    return this.get(apiConfig.endpoints.integrations.whatsapp.getMessages(chatId), {
      limit
    });
  }

  // Métodos para gestión de mensajes WhatsApp
  async sendMessage(data: {
    contactId: string;
    content: string;
    messageType?: string;
  }) {
    return this.post('/api/whatsapp/send', {
      contactId: data.contactId,
      content: data.content,
      messageType: data.messageType || 'text'
    });
  }

  async sendMediaMessage(to: string, file: File, caption?: string, mediaType?: string) {
    const formData = new FormData();
    formData.append('media', file);
    formData.append('to', to);
    if (caption) formData.append('caption', caption);
    if (mediaType) formData.append('mediaType', mediaType);

    return this.request('/api/messages/send-media', {
      method: 'POST',
      body: formData,
      headers: {
        ...this.getHeaders(),
        // No incluir Content-Type para FormData, el navegador lo establecerá automáticamente
      }
    });
  }

  async getWhatsAppChatsNew(params?: { limit?: number; offset?: number }) {
    return this.get('/api/whatsapp/chats', params);
  }

  async getWhatsAppMessagesNew(chatId: string, params?: { limit?: number; offset?: number }) {
    return this.get(`/api/whatsapp/chats/${chatId}/messages`, params);
  }

  async markAsRead(chatId: string, messageIds?: string[]) {
    return this.post(`/api/messages/chats/${chatId}/mark-read`, {
      messageIds
    });
  }

  async getRecentMessages(limit?: number) {
    return this.get('/api/messages/recent', { limit });
  }

  async searchMessages(query: string, params?: { chatId?: string; limit?: number }) {
    return this.get('/api/messages/search', {
      query,
      ...params
    });
  }

  async getMessageStats() {
    return this.get('/api/messages/stats');
  }

  async setupMessageWebhook(webhookUrl: string, events?: string[]) {
    return this.post('/api/messages/webhook', {
      webhookUrl,
      events: events || ['message', 'messageUpdate']
    });
  }

  // Métodos para gestión de contactos
  async getContacts(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    return this.get<PaginatedResponse<Contact>>('/api/whatsapp/contacts', params);
  }

  async getContact(id: string) {
    return this.get<Contact>(`/api/whatsapp/contacts/${id}`);
  }

  async searchContacts(query: string, params?: {
    page?: number;
    limit?: number;
  }) {
    return this.get<PaginatedResponse<Contact>>('/api/whatsapp/contacts', {
      search: query,
      ...params
    });
  }

  async updateContact(id: string, data: Partial<Contact>) {
    return this.put<Contact>(`/api/whatsapp/contacts/${id}`, data);
  }

  async blockContact(id: string) {
    return this.post<Contact>(`/api/whatsapp/contacts/${id}/block`);
  }

  async unblockContact(id: string) {
    return this.post<Contact>(`/api/whatsapp/contacts/${id}/unblock`);
  }

  async deleteContact(id: string) {
    return this.delete(`/api/whatsapp/contacts/${id}`);
  }

  async getContactData(whatsappId: string) {
    return this.get<Contact>(`/api/whatsapp/contacts/data/${whatsappId}`);
  }

  // Métodos para programación
  async getScheduledMessages(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) {
    return this.get<PaginatedResponse<any>>('/api/scheduled', params);
  }

  async getScheduledMessage(id: string) {
    return this.get(`/api/scheduled/${id}`);
  }

  async createScheduledMessage(data: {
    contactId: number;
    content: string;
    messageType?: string;
    scheduledTime: string;
  }) {
    return this.post('/api/scheduled', data);
  }

  async updateScheduledMessage(id: string, data: {
    content?: string;
    messageType?: string;
    scheduledTime?: string;
  }) {
    return this.put(`/api/scheduled/${id}`, data);
  }

  async deleteScheduledMessage(id: string) {
    return this.delete(`/api/scheduled/${id}`);
  }

  async cancelScheduledMessage(id: string) {
    return this.post(`/api/scheduled/${id}/cancel`);
  }
}

// Instancia singleton del servicio
export const apiService = new ApiService();

export default apiService;
