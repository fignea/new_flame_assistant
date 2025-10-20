import { apiConfig, getAuthHeaders, buildURL } from '../config/api';
import { 
  ApiResponse, 
  PaginatedResponse, 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse,
  User,
  Tenant,
  Contact,
  Conversation,
  Assistant,
  Message,
  ResponseTemplate,
  Tag,
  ScheduledMessage,
  DashboardStats,
  ContactFilters,
  ConversationFilters,
  MessageFilters,
  CreateContactRequest,
  CreateConversationRequest,
  CreateAssistantRequest,
  CreateResponseTemplateRequest,
  CreateTagRequest,
  CreateScheduledMessageRequest
} from '../types';

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
    const fullUrl = buildURL(endpoint);
    
    // En producción, usar la URL directamente sin new URL() para evitar problemas con URLs relativas
    if (process.env.NODE_ENV === 'production') {
      let url = fullUrl;
      if (params) {
        const searchParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
          if (params[key] !== undefined && params[key] !== null) {
            searchParams.append(key, params[key].toString());
          }
        });
        const queryString = searchParams.toString();
        if (queryString) {
          url += (url.includes('?') ? '&' : '?') + queryString;
        }
      }
      return this.request<T>(url, {
        method: 'GET'
      });
    }
    
    // En desarrollo, usar new URL() como antes
    const url = new URL(fullUrl);
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

  // ========================================
  // MÉTODOS DE AUTENTICACIÓN MULTI-TENANT
  // ========================================

  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return this.post(apiConfig.endpoints.auth.login, credentials);
  }

  async register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    return this.post(apiConfig.endpoints.auth.register, data);
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<{ access_token: string; expires_in: number }>> {
    return this.post(apiConfig.endpoints.auth.refresh, { refresh_token: refreshToken });
  }

  async logout(): Promise<ApiResponse> {
    return this.post(apiConfig.endpoints.auth.logout);
  }

  async getProfile(): Promise<ApiResponse<{ user: User; tenant: Tenant }>> {
    return this.get(apiConfig.endpoints.auth.profile);
  }

  async updateProfile(profileData: Partial<User>): Promise<ApiResponse<{ user: User; tenant: Tenant }>> {
    return this.put(apiConfig.endpoints.auth.profile, profileData);
  }

  // ========================================
  // MÉTODOS DE TENANT
  // ========================================

  async getTenants(): Promise<ApiResponse<Tenant[]>> {
    return this.get('/api/tenants');
  }

  async getTenantBySlug(slug: string): Promise<ApiResponse<Tenant>> {
    return this.get(`/api/tenants/slug/${slug}`);
  }

  async createTenant(data: any): Promise<ApiResponse<Tenant>> {
    return this.post('/api/tenants', data);
  }

  async updateTenant(id: string, data: any): Promise<ApiResponse<Tenant>> {
    return this.put(`/api/tenants/${id}`, data);
  }

  // ========================================
  // MÉTODOS DE USUARIOS
  // ========================================

  async getUsers(params?: { page?: number; limit?: number; role?: string }): Promise<ApiResponse<PaginatedResponse<User>>> {
    return this.get('/api/users', params);
  }

  async getUser(id: string): Promise<ApiResponse<User>> {
    return this.get(`/api/users/${id}`);
  }

  async createUser(data: any): Promise<ApiResponse<User>> {
    return this.post('/api/users', data);
  }

  async updateUser(id: string, data: any): Promise<ApiResponse<User>> {
    return this.put(`/api/users/${id}`, data);
  }

  async deleteUser(id: string): Promise<ApiResponse> {
    return this.delete(`/api/users/${id}`);
  }

  // ========================================
  // MÉTODOS DE CONTACTOS
  // ========================================

  async getContacts(filters?: ContactFilters): Promise<ApiResponse<PaginatedResponse<Contact>>> {
    return this.get('/api/contacts', filters);
  }

  async getContact(id: string): Promise<ApiResponse<Contact>> {
    return this.get(`/api/contacts/${id}`);
  }

  async createContact(data: CreateContactRequest): Promise<ApiResponse<Contact>> {
    return this.post('/api/contacts', data);
  }

  async updateContact(id: string, data: Partial<Contact>): Promise<ApiResponse<Contact>> {
    return this.put(`/api/contacts/${id}`, data);
  }

  async deleteContact(id: string): Promise<ApiResponse> {
    return this.delete(`/api/contacts/${id}`);
  }

  async searchContacts(query: string, params?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<Contact>>> {
    return this.get('/api/contacts/search', { q: query, ...params });
  }

  async blockContact(id: string): Promise<ApiResponse<Contact>> {
    return this.post(`/api/contacts/${id}/block`);
  }

  async unblockContact(id: string): Promise<ApiResponse<Contact>> {
    return this.post(`/api/contacts/${id}/unblock`);
  }

  async getContactStats(id: string): Promise<ApiResponse<any>> {
    return this.get(`/api/contacts/${id}/stats`);
  }

  // ========================================
  // MÉTODOS DE CONVERSACIONES
  // ========================================

  async getConversations(filters?: ConversationFilters): Promise<ApiResponse<PaginatedResponse<Conversation>>> {
    return this.get('/api/conversations', filters);
  }

  async getConversation(id: string): Promise<ApiResponse<Conversation>> {
    return this.get(`/api/conversations/${id}`);
  }

  async createConversation(data: CreateConversationRequest): Promise<ApiResponse<Conversation>> {
    return this.post('/api/conversations', data);
  }

  async updateConversation(id: string, data: any): Promise<ApiResponse<Conversation>> {
    return this.put(`/api/conversations/${id}`, data);
  }

  async deleteConversation(id: string): Promise<ApiResponse> {
    return this.delete(`/api/conversations/${id}`);
  }

  async getConversationMessages(conversationId: string, filters?: MessageFilters): Promise<ApiResponse<PaginatedResponse<Message>>> {
    return this.get(`/api/conversations/${conversationId}/messages`, filters);
  }

  async sendMessage(conversationId: string, data: { content: string; message_type?: string; metadata?: any }): Promise<ApiResponse<Message>> {
    return this.post(`/api/conversations/${conversationId}/messages`, data);
  }

  async markConversationAsRead(conversationId: string): Promise<ApiResponse> {
    return this.put(`/api/conversations/${conversationId}/read`);
  }

  async getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    return this.get('/api/conversations/unread-count');
  }

  async assignConversation(id: string, userId: string): Promise<ApiResponse<Conversation>> {
    return this.post(`/api/conversations/${id}/assign`, { assigned_to: userId });
  }

  async updateConversationStatus(id: string, status: string): Promise<ApiResponse<Conversation>> {
    return this.put(`/api/conversations/${id}/status`, { status });
  }

  // ========================================
  // MÉTODOS DE ASISTENTES
  // ========================================

  async getAssistants(params?: { page?: number; limit?: number; is_active?: boolean }): Promise<ApiResponse<PaginatedResponse<Assistant>>> {
    return this.get('/api/assistants', params);
  }

  async getAssistant(id: string): Promise<ApiResponse<Assistant>> {
    return this.get(`/api/assistants/${id}`);
  }

  async createAssistant(data: CreateAssistantRequest): Promise<ApiResponse<Assistant>> {
    return this.post('/api/assistants', data);
  }

  async updateAssistant(id: string, data: any): Promise<ApiResponse<Assistant>> {
    return this.put(`/api/assistants/${id}`, data);
  }

  async deleteAssistant(id: string): Promise<ApiResponse> {
    return this.delete(`/api/assistants/${id}`);
  }

  async testAssistant(id: string, message: string): Promise<ApiResponse<{ response: string }>> {
    return this.post(`/api/assistants/${id}/test`, { message });
  }

  async getAssistantStats(id: string): Promise<ApiResponse<any>> {
    return this.get(`/api/assistants/${id}/stats`);
  }

  async getAssistantsStats(): Promise<ApiResponse<any>> {
    return this.get('/api/assistants/stats');
  }

  async searchAssistants(query: string, params?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<Assistant>>> {
    return this.get('/api/assistants/search', { q: query, ...params });
  }

  // ========================================
  // MÉTODOS DE MENSAJES
  // ========================================

  async getMessages(filters?: MessageFilters): Promise<ApiResponse<PaginatedResponse<Message>>> {
    return this.get('/api/messages', filters);
  }

  async getMessage(id: string): Promise<ApiResponse<Message>> {
    return this.get(`/api/messages/${id}`);
  }

  async createMessage(data: any): Promise<ApiResponse<Message>> {
    return this.post('/api/messages', data);
  }

  async updateMessage(id: string, data: any): Promise<ApiResponse<Message>> {
    return this.put(`/api/messages/${id}`, data);
  }

  async deleteMessage(id: string): Promise<ApiResponse> {
    return this.delete(`/api/messages/${id}`);
  }

  async getMessagesByConversation(conversationId: string, filters?: MessageFilters): Promise<ApiResponse<PaginatedResponse<Message>>> {
    return this.get(`/api/messages/conversation/${conversationId}`, filters);
  }

  // ========================================
  // MÉTODOS DE PLANTILLAS
  // ========================================

  async getTemplates(params?: { page?: number; limit?: number; assistant_id?: string; category?: string }): Promise<ApiResponse<PaginatedResponse<ResponseTemplate>>> {
    return this.get('/api/templates', params);
  }

  async getTemplate(id: string): Promise<ApiResponse<ResponseTemplate>> {
    return this.get(`/api/templates/${id}`);
  }

  async createTemplate(data: CreateResponseTemplateRequest): Promise<ApiResponse<ResponseTemplate>> {
    return this.post('/api/templates', data);
  }

  async updateTemplate(id: string, data: any): Promise<ApiResponse<ResponseTemplate>> {
    return this.put(`/api/templates/${id}`, data);
  }

  async deleteTemplate(id: string): Promise<ApiResponse> {
    return this.delete(`/api/templates/${id}`);
  }

  async searchTemplates(query: string, params?: { assistant_id?: string }): Promise<ApiResponse<ResponseTemplate[]>> {
    return this.get('/api/templates/search', { q: query, ...params });
  }

  // ========================================
  // MÉTODOS DE ETIQUETAS
  // ========================================

  async getTags(params?: { page?: number; limit?: number; is_active?: boolean }): Promise<ApiResponse<PaginatedResponse<Tag>>> {
    return this.get('/api/tags', params);
  }

  async getTag(id: string): Promise<ApiResponse<Tag>> {
    return this.get(`/api/tags/${id}`);
  }

  async createTag(data: CreateTagRequest): Promise<ApiResponse<Tag>> {
    return this.post('/api/tags', data);
  }

  async updateTag(id: string, data: any): Promise<ApiResponse<Tag>> {
    return this.put(`/api/tags/${id}`, data);
  }

  async deleteTag(id: string): Promise<ApiResponse> {
    return this.delete(`/api/tags/${id}`);
  }

  async tagConversation(tagId: string, conversationId: string): Promise<ApiResponse> {
    return this.post(`/api/tags/${tagId}/conversations/${conversationId}`);
  }

  async untagConversation(tagId: string, conversationId: string): Promise<ApiResponse> {
    return this.delete(`/api/tags/${tagId}/conversations/${conversationId}`);
  }

  async tagContact(tagId: string, contactId: string): Promise<ApiResponse> {
    return this.post(`/api/tags/${tagId}/contacts/${contactId}`);
  }

  async untagContact(tagId: string, contactId: string): Promise<ApiResponse> {
    return this.delete(`/api/tags/${tagId}/contacts/${contactId}`);
  }

  // ========================================
  // MÉTODOS DE MENSAJES PROGRAMADOS
  // ========================================

  async getScheduledMessages(params?: { page?: number; limit?: number; status?: string }): Promise<ApiResponse<PaginatedResponse<ScheduledMessage>>> {
    return this.get('/api/scheduled-messages', params);
  }

  async getScheduledMessage(id: string): Promise<ApiResponse<ScheduledMessage>> {
    return this.get(`/api/scheduled-messages/${id}`);
  }

  async createScheduledMessage(data: CreateScheduledMessageRequest): Promise<ApiResponse<ScheduledMessage>> {
    return this.post('/api/scheduled-messages', data);
  }

  async updateScheduledMessage(id: string, data: any): Promise<ApiResponse<ScheduledMessage>> {
    return this.put(`/api/scheduled-messages/${id}`, data);
  }

  async deleteScheduledMessage(id: string): Promise<ApiResponse> {
    return this.delete(`/api/scheduled-messages/${id}`);
  }

  async cancelScheduledMessage(id: string): Promise<ApiResponse> {
    return this.post(`/api/scheduled-messages/${id}/cancel`);
  }

  // ========================================
  // MÉTODOS DE DASHBOARD
  // ========================================

  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.get('/api/dashboard/stats');
  }

  async getRecentActivity(): Promise<ApiResponse<any[]>> {
    return this.get('/api/dashboard/recent-activity');
  }

  async getPerformanceMetrics(): Promise<ApiResponse<any>> {
    return this.get('/api/dashboard/performance');
  }

  async getTenantInfo(): Promise<ApiResponse<any>> {
    return this.get('/api/dashboard/tenant-info');
  }

  // ========================================
  // MÉTODOS DE INTEGRACIONES
  // ========================================

  async getIntegrations(): Promise<ApiResponse<any[]>> {
    return this.get('/api/integrations');
  }

  async createIntegration(data: any): Promise<ApiResponse<any>> {
    return this.post('/api/integrations', data);
  }

  async updateIntegration(id: string, data: any): Promise<ApiResponse<any>> {
    return this.put(`/api/integrations/${id}`, data);
  }

  async deleteIntegration(id: string): Promise<ApiResponse> {
    return this.delete(`/api/integrations/${id}`);
  }

  // ========================================
  // MÉTODOS DE WHATSAPP
  // ========================================

  async createWhatsAppSession(): Promise<ApiResponse<any>> {
    return this.post('/api/whatsapp/sessions');
  }

  async getWhatsAppQR(): Promise<ApiResponse<{ qrCode: string }>> {
    return this.get('/api/whatsapp/qr');
  }

  async getWhatsAppStatus(): Promise<ApiResponse<any>> {
    return this.get('/api/whatsapp/status');
  }

  async disconnectWhatsApp(): Promise<ApiResponse> {
    return this.post('/api/whatsapp/disconnect');
  }

  async sendWhatsAppMessage(to: string, message: string): Promise<ApiResponse<any>> {
    return this.post('/api/whatsapp/send', { to, message });
  }

  // ========================================
  // MÉTODOS DE WEB CHAT
  // ========================================

  async getWebChatConversations(params?: { page?: number; limit?: number; status?: string; assigned_to?: string }): Promise<ApiResponse<PaginatedResponse<Conversation>>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.assigned_to) queryParams.append('assigned_to', params.assigned_to);
    
    const query = queryParams.toString();
    return this.get(`/api/webchat/conversations${query ? `?${query}` : ''}`);
  }

  async createWebChatConversation(data: { contact_name: string; contact_email?: string; contact_phone?: string; message: string }): Promise<ApiResponse<Conversation>> {
    return this.post('/api/webchat/conversations', data);
  }

  async getWebChatConversation(id: string): Promise<ApiResponse<Conversation>> {
    return this.get(`/api/webchat/conversations/${id}`);
  }

  async sendWebChatMessage(conversationId: string, content: string, sender_type: 'visitor' | 'agent' = 'visitor'): Promise<ApiResponse<Message>> {
    return this.post(`/api/webchat/conversations/${conversationId}/messages`, { content, sender_type });
  }

  async updateWebChatConversation(id: string, data: { status?: string; priority?: string; assigned_to?: string; subject?: string }): Promise<ApiResponse<Conversation>> {
    return this.put(`/api/webchat/conversations/${id}`, data);
  }

  async deleteWebChatConversation(id: string): Promise<ApiResponse<any>> {
    return this.delete(`/api/webchat/conversations/${id}`);
  }

  async assignWebChatConversation(id: string, assigned_to: string): Promise<ApiResponse<Conversation>> {
    return this.post(`/api/webchat/conversations/${id}/assign`, { assigned_to });
  }

  // ========================================
  // MÉTODOS DE MEDIA
  // ========================================

  async uploadMedia(file: File, type?: string): Promise<ApiResponse<{ url: string; id: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    if (type) formData.append('type', type);

    return this.request('/api/media/upload', {
      method: 'POST',
      body: formData,
      headers: {
        ...this.getHeaders(),
        // No incluir Content-Type para FormData
      }
    });
  }

  async getMedia(id: string): Promise<ApiResponse<any>> {
    return this.get(`/api/media/${id}`);
  }

  async deleteMedia(id: string): Promise<ApiResponse> {
    return this.delete(`/api/media/${id}`);
  }

  // ========================================
  // MÉTODOS DE ASIGNACIONES
  // ========================================

  async assignAssistant(data: { assistant_id: string; conversation_id: string; platform: string }): Promise<ApiResponse<any>> {
    return this.post('/api/assignments', data);
  }

  async unassignAssistant(conversationId: string, platform: string): Promise<ApiResponse> {
    return this.delete(`/api/assignments/conversations/${conversationId}/${platform}`);
  }

  async getAssignedAssistant(conversationId: string, platform: string): Promise<ApiResponse<any>> {
    return this.get(`/api/assignments/conversations/${conversationId}/${platform}`);
  }

  async getAssignments(params?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.get('/api/assignments', params);
  }

  // ========================================
  // MÉTODOS DE RESPUESTAS AUTOMÁTICAS
  // ========================================

  async processIncomingMessage(data: { message: any }): Promise<ApiResponse<any>> {
    return this.post('/api/auto-response/process', data);
  }

  async sendAutoResponse(data: { chat_id: string; response: string; assistant_id?: string; template_id?: string }): Promise<ApiResponse> {
    return this.post('/api/auto-response/send', data);
  }

  async shouldAutoRespond(conversationId: string, platform: string): Promise<ApiResponse<{ should_respond: boolean }>> {
    return this.get(`/api/auto-response/should-respond/${conversationId}/${platform}`);
  }

  // ========================================
  // MÉTODOS DE CONFIGURACIÓN
  // ========================================

  async getSystemInfo(): Promise<ApiResponse<any>> {
    return this.get('/api/config/system-info');
  }

  async getDatabaseStatus(): Promise<ApiResponse<any>> {
    return this.get('/api/config/database-status');
  }

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<ApiResponse> {
    return this.put('/api/config/change-password', data);
  }

  // ========================================
  // MÉTODOS LEGACY (COMPATIBILIDAD)
  // ========================================

  // Mantener métodos legacy para compatibilidad
  async getWhatsAppChatsLegacy(params?: { limit?: number; offset?: number }): Promise<ApiResponse<any[]>> {
    return this.get('/api/whatsapp/chats', params);
  }

  async getWhatsAppMessagesLegacy(chatId: string, params?: { limit?: number; offset?: number }): Promise<ApiResponse<any[]>> {
    return this.get(`/api/whatsapp/chats/${chatId}/messages`, params);
  }

  async sendMessageLegacy(data: { contactId: string; content: string; messageType?: string }): Promise<ApiResponse<any>> {
    return this.post('/api/whatsapp/send', data);
  }

  async scheduleMessageLegacy(data: { contactId: string; content: string; messageType?: string; scheduledTime: string }): Promise<ApiResponse<any>> {
    return this.post('/api/scheduled', data);
  }
}

// Instancia singleton del servicio
export const apiService = new ApiService();

export default apiService;