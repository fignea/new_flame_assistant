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
  last_message_at?: string;
  unread_count?: number;
  assigned_assistant_id?: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  status?: 'active' | 'closed' | 'pending' | 'resolved';
  tags?: string[];
  notes?: string;
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

// Nuevas interfaces para funcionalidades avanzadas

// Interfaz para Assistant
export interface Assistant {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  prompt?: string;
  is_active: boolean;
  openai_api_key?: string;
  model: string;
  max_tokens: number;
  temperature: number;
  auto_assign: boolean;
  response_delay: number;
  created_at: string;
  updated_at: string;
}

// Interfaz para Assignment
export interface Assignment {
  id: number;
  assistant_id: number;
  conversation_id: string;
  platform: string;
  assigned_at: string;
  is_active: boolean;
  assistant?: Assistant;
}

// Interfaz para ResponseTemplate
export interface ResponseTemplate {
  id: number;
  assistant_id: number;
  user_id: number;
  name: string;
  content: string;
  category: 'greeting' | 'farewell' | 'question' | 'information' | 'escalation' | 'general';
  trigger_keywords: string[];
  conditions?: Record<string, any>;
  is_active: boolean;
  priority: number;
  response_delay: number;
  created_at: string;
  updated_at: string;
  assistant?: Assistant;
}

// Interfaz para Tag
export interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Interfaz para ConversationTag
export interface ConversationTag {
  id: number;
  conversation_id: string;
  platform: string;
  tag_id: number;
  created_at: string;
  tag?: Tag;
}

// Interfaz para ContactTag
export interface ContactTag {
  id: number;
  contact_id: number;
  tag_id: number;
  created_at: string;
  tag?: Tag;
}

// Interfaz para InteractionHistory
export interface InteractionHistory {
  id: number;
  contact_id: number;
  interaction_type: 'message' | 'call' | 'email' | 'meeting' | 'note';
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// Interfaz para ContactNote
export interface ContactNote {
  id: number;
  contact_id: number;
  user_id: number;
  content: string;
  is_important: boolean;
  created_at: string;
  updated_at: string;
}

// Interfaz para AssistantConfig
export interface AssistantConfig {
  id: number;
  assistant_id: number;
  config_key: string;
  config_value: string;
  created_at: string;
  updated_at: string;
}

// Interfaz para AutoResponseResult
export interface AutoResponseResult {
  should_respond: boolean;
  response?: string;
  template_id?: number;
  confidence?: number;
  reason?: string;
}

// Interfaz para estadísticas
export interface AssignmentStats {
  total_assignments: number;
  active_assignments: number;
  assignments_by_assistant: Record<string, number>;
  assignments_by_platform: Record<string, number>;
}

export interface TemplateStats {
  total_templates: number;
  active_templates: number;
  templates_by_category: Record<string, number>;
  templates_by_assistant: Record<string, number>;
}

export interface TagStats {
  total_tags: number;
  active_tags: number;
  tags_by_contact: Record<string, number>;
  tags_by_conversation: Record<string, number>;
}

export interface AutoResponseStats {
  total_processed: number;
  successful_responses: number;
  failed_responses: number;
  average_response_time: number;
  responses_by_assistant: Record<string, number>;
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

  async getAssistantsStats() {
    return this.get('/api/assistants/stats');
  }

  async getAssignmentsStats() {
    return this.get('/api/assignments/stats');
  }

  async getDashboardStats() {
    return this.get('/api/dashboard/stats');
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
    return this.get<Contact>(`/api/whatsapp/contacts/data/${encodeURIComponent(whatsappId)}`);
  }

  async createContact(data: {
    name: string;
    phone_number?: string;
    whatsapp_id?: string;
    is_group?: boolean;
  }) {
    return this.post<Contact>('/api/whatsapp/contacts', data);
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

  // Métodos para Web Chat
  async getWebChatConversations(params?: {
    status?: string;
    assigned_to?: number;
    limit?: number;
    offset?: number;
  }) {
    return this.get('/api/integrations/web/conversations', params);
  }

  async getWebChatConversation(conversationId: string) {
    return this.get(`/api/integrations/web/conversations/${conversationId}`);
  }

  async createWebChatConversation(data: {
    visitor: {
      session_id: string;
      name?: string;
      email?: string;
      phone?: string;
      ip_address?: string;
      user_agent?: string;
      location?: string;
    };
    initial_message?: string;
  }) {
    return this.post('/api/integrations/web/conversations', data);
  }

  async updateWebChatConversation(conversationId: string, data: {
    status?: 'active' | 'closed' | 'pending' | 'resolved';
    assigned_to?: number;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    tags?: string[];
    metadata?: Record<string, any>;
  }) {
    return this.put(`/api/integrations/web/conversations/${conversationId}`, data);
  }

  async getWebChatMessages(conversationId: string, params?: {
    limit?: number;
    offset?: number;
  }) {
    return this.get(`/api/integrations/web/conversations/public/${conversationId}/messages`, params);
  }

  async sendWebChatMessage(data: {
    conversation_id: number;
    content: string;
    message_type?: 'text' | 'image' | 'video' | 'audio' | 'file' | 'emoji';
    metadata?: Record<string, any>;
  }) {
    return this.post('/api/integrations/web/agent-messages', data);
  }

  async markWebChatMessagesAsRead(conversationId: string) {
    return this.post(`/api/integrations/web/conversations/${conversationId}/read`);
  }

  async getWebChatStats() {
    return this.get('/api/integrations/web/stats');
  }

  async getWebChatWidgetScript(domain?: string) {
    return this.get('/api/integrations/web/widget-script', { domain });
  }

  // ===== NUEVOS MÉTODOS PARA FUNCIONALIDADES AVANZADAS =====

  // Métodos para Asignaciones
  async assignAssistant(data: {
    assistant_id: number;
    conversation_id: string;
    platform: string;
  }) {
    return this.post<Assignment>('/api/assignments', data);
  }

  async getUserAssignments() {
    return this.get<Assignment[]>('/api/assignments');
  }

  async getAssignedAssistant(conversationId: string, platform: string) {
    return this.get<Assignment>(`/api/assignments/conversation/${conversationId}/${platform}`);
  }

  async unassignAssistant(conversationId: string, platform: string) {
    return this.delete(`/api/assignments/conversation/${conversationId}/${platform}`);
  }

  async autoAssignAssistant(data: {
    conversation_id: string;
    platform: string;
    contact_id?: number;
  }) {
    return this.post<Assignment>('/api/assignments/auto-assign', data);
  }

  async getAssignmentStats() {
    return this.get<AssignmentStats>('/api/assignments/stats');
  }

  async getConversationsByAssistant(assistantId: string, params?: {
    limit?: number;
    offset?: number;
  }) {
    return this.get<Assignment[]>(`/api/assignments/assistant/${assistantId}`, params);
  }

  async hasAssignedAssistant(conversationId: string, platform: string) {
    return this.get<{ has_assignment: boolean }>(`/api/assignments/check/${conversationId}/${platform}`);
  }

  // Métodos para Plantillas de Respuestas
  async createTemplate(data: {
    name: string;
    content: string;
    assistant_id: number;
    category?: 'greeting' | 'farewell' | 'question' | 'information' | 'escalation' | 'general';
    trigger_keywords?: string[];
    priority?: number;
    response_delay?: number;
    is_active?: boolean;
  }) {
    return this.post<ResponseTemplate>('/api/templates', data);
  }

  async getUserTemplates(params?: {
    assistant_id?: number;
    category?: string;
  }) {
    return this.get<ResponseTemplate[]>('/api/templates', params);
  }

  async getTemplateById(id: string) {
    return this.get<ResponseTemplate>(`/api/templates/${id}`);
  }

  async updateTemplate(id: string, data: Partial<ResponseTemplate>) {
    return this.put<ResponseTemplate>(`/api/templates/${id}`, data);
  }

  async deleteTemplate(id: string) {
    return this.delete(`/api/templates/${id}`);
  }

  async searchTemplatesByKeywords(data: {
    keywords: string[];
    assistant_id?: number;
  }) {
    return this.post<ResponseTemplate[]>('/api/templates/search', data);
  }

  async getTemplatesByCategory(category: string, params?: {
    assistant_id?: number;
  }) {
    return this.get<ResponseTemplate[]>(`/api/templates/category/${category}`, params);
  }

  async duplicateTemplate(id: string, newName: string) {
    return this.post<ResponseTemplate>(`/api/templates/${id}/duplicate`, { new_name: newName });
  }

  async getTemplateStats() {
    return this.get<TemplateStats>('/api/templates/stats');
  }

  async getTemplatesStats() {
    return this.get<TemplateStats>('/api/templates/stats');
  }

  // Métodos para Etiquetas
  async createTag(data: {
    name: string;
    color: string;
    description?: string;
    is_active?: boolean;
  }) {
    return this.post<Tag>('/api/tags', data);
  }

  async getUserTags(params?: {
    active_only?: boolean;
  }) {
    return this.get<Tag[]>('/api/tags', params);
  }

  async getTagById(id: string) {
    return this.get<Tag>(`/api/tags/${id}`);
  }

  async updateTag(id: string, data: Partial<Tag>) {
    return this.put<Tag>(`/api/tags/${id}`, data);
  }

  async deleteTag(id: string) {
    return this.delete(`/api/tags/${id}`);
  }

  async tagConversation(tagId: string, data: {
    conversation_id: string;
    platform: string;
  }) {
    return this.post<ConversationTag>(`/api/tags/${tagId}/conversation`, data);
  }

  async tagContact(tagId: string, data: {
    contact_id: number;
  }) {
    return this.post<ContactTag>(`/api/tags/${tagId}/contact`, data);
  }

  async getConversationTags(conversationId: string, platform: string) {
    return this.get<Tag[]>(`/api/tags/conversation/${conversationId}/${platform}`);
  }

  async getContactTags(contactId: string) {
    return this.get<Tag[]>(`/api/tags/contact/${contactId}`);
  }

  async untagConversation(tagId: string, conversationId: string, platform: string) {
    return this.delete(`/api/tags/${tagId}/conversation/${conversationId}/${platform}`);
  }

  async untagContact(tagId: string, contactId: string) {
    return this.delete(`/api/tags/${tagId}/contact/${contactId}`);
  }

  async getConversationsByTag(tagId: string, params?: {
    platform?: string;
  }) {
    return this.get<any[]>(`/api/tags/${tagId}/conversations`, params);
  }

  async getContactsByTag(tagId: string) {
    return this.get<Contact[]>(`/api/tags/${tagId}/contacts`);
  }

  async getTags() {
    return this.get<Tag[]>('/api/tags');
  }

  async getTagStats() {
    return this.get<TagStats>('/api/tags/stats');
  }

  async getTagsStats() {
    return this.get<TagStats>('/api/tags/stats');
  }

  // Métodos para Respuestas Automáticas
  async processIncomingMessage(data: {
    message: {
      id: string;
      chat_id: string;
      content: string;
      sender: string;
      timestamp: string;
    };
  }) {
    return this.post<AutoResponseResult>('/api/auto-response/process', data);
  }

  async sendAutoResponse(data: {
    chat_id: string;
    response: string;
    assistant_id?: number;
    template_id?: number;
  }) {
    return this.post('/api/auto-response/send', data);
  }

  async processWebMessage(data: {
    conversation_id: string;
    message_content: string;
  }) {
    return this.post<AutoResponseResult>('/api/auto-response/process-web', data);
  }

  async shouldAutoRespond(conversationId: string, platform: string) {
    return this.get<{ should_respond: boolean }>(`/api/auto-response/should-respond/${conversationId}/${platform}`);
  }

  async getAutoResponseStats() {
    return this.get<AutoResponseStats>('/api/auto-response/stats');
  }

  // Métodos adicionales para Asistentes
  async getAvailableModels(apiKey: string) {
    return this.get<string[]>(`/api/assistants/models?api_key=${encodeURIComponent(apiKey)}`);
  }

  async validateApiKey(data: {
    api_key: string;
  }) {
    return this.post<{ valid: boolean }>('/api/assistants/validate-key', data);
  }

  async getUsageInfo(assistantId: string) {
    return this.get<{
      total_usage: number;
      total_granted: number;
      total_available: number;
    }>(`/api/assistants/${assistantId}/usage`);
  }

  // Métodos para Notas de Contacto
  async getContactNotes(contactId: string) {
    return this.get<ContactNote[]>(`/api/contacts/${contactId}/notes`);
  }

  async createContactNote(contactId: string, data: {
    content: string;
    is_important?: boolean;
  }) {
    return this.post<ContactNote>(`/api/contacts/${contactId}/notes`, data);
  }

  async updateContactNote(contactId: string, noteId: string, data: {
    content?: string;
    is_important?: boolean;
  }) {
    return this.put<ContactNote>(`/api/contacts/${contactId}/notes/${noteId}`, data);
  }

  async deleteContactNote(contactId: string, noteId: string) {
    return this.delete(`/api/contacts/${contactId}/notes/${noteId}`);
  }

  // Métodos para Historial de Interacciones
  async getContactInteractionHistory(contactId: string, params?: {
    limit?: number;
    offset?: number;
    type?: string;
  }) {
    return this.get<InteractionHistory[]>(`/api/contacts/${contactId}/interactions`, params);
  }

  async createInteractionHistory(contactId: string, data: {
    interaction_type: 'message' | 'call' | 'email' | 'meeting' | 'note';
    content: string;
    metadata?: Record<string, any>;
  }) {
    return this.post<InteractionHistory>(`/api/contacts/${contactId}/interactions`, data);
  }
}

// Instancia singleton del servicio
export const apiService = new ApiService();

export default apiService;
