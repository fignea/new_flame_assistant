import { apiConfig, getAuthHeaders, buildURL } from '../config/api';

// Tipos de respuesta de la API
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: any;
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

  async getMessages(conversationId: string, params?: {
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

  async sendMessage(conversationId: string, messageData: {
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

  async getWhatsAppChats() {
    return this.get(apiConfig.endpoints.integrations.whatsapp.getChats);
  }

  async getWhatsAppMessages(chatId: string, limit?: number) {
    return this.get(apiConfig.endpoints.integrations.whatsapp.getMessages(chatId), {
      limit
    });
  }
}

// Instancia singleton del servicio
export const apiService = new ApiService();

export default apiService;
