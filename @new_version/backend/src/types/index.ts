import { Request } from 'express';

// Usuario autenticado en request
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
  };
}

// Modelos de base de datos
export interface User {
  id: number;
  email: string;
  password: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppSession {
  id: number;
  user_id: number;
  session_id: string;
  phone_number?: string;
  name?: string;
  is_connected: boolean;
  qr_code?: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: number;
  user_id: number;
  whatsapp_id: string;
  name?: string;
  phone_number?: string;
  is_group: boolean;
  avatar_url?: string;
  is_blocked: boolean;
  last_interaction?: string;
  interaction_count: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  user_id: number;
  whatsapp_message_id: string;
  contact_id?: number;
  chat_id: string;
  content: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker';
  is_from_me: boolean;
  timestamp: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  media_url?: string;
  assistant_id?: number;
  is_auto_response: boolean;
  template_id?: number;
  created_at: string;
}

export interface ScheduledMessage {
  id: number;
  user_id: number;
  contact_id: number;
  content: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'document';
  scheduled_time: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sent_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// WhatsApp específico
export interface WhatsAppMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName?: string;
  content: string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 
              'contact' | 'location' | 'group_invite' | 'poll' | 'poll_update' | 
              'reaction' | 'security_update' | 'revoked' | 'read_receipt' | 
              'delivery_receipt' | 'protocol_update' | 'list' | 'list_response' | 
              'buttons' | 'button_response' | 'template' | 'order' | 'product' | 
              'call_log' | 'view_once' | 'view_once_image' | 'view_once_video' | 
              'ephemeral' | 'unknown';
  timestamp: number;
  isFromMe: boolean;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  mediaUrl?: string;
  quotedMessage?: WhatsAppMessage;
}

export interface WhatsAppContact {
  id: string;
  name?: string;
  phoneNumber?: string;
  isGroup: boolean;
  avatarUrl?: string;
  lastSeen?: Date;
  unreadCount: number;
}

export interface WhatsAppConnectionStatus {
  isConnected: boolean;
  isAuthenticated: boolean;
  sessionId?: string;
  phoneNumber?: string;
  userName?: string;
  qrCode?: string;
  lastSeen?: Date;
}

// API Responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Socket Events
export interface SocketEvents {
  // WhatsApp events
  'whatsapp:qr': (qrCode: string) => void;
  'whatsapp:connected': (sessionInfo: WhatsAppConnectionStatus) => void;
  'whatsapp:disconnected': () => void;
  'whatsapp:message': (message: WhatsAppMessage) => void;
  'whatsapp:contact': (contact: WhatsAppContact) => void;
  
  // Web Chat events
  'web:conversation:new': (conversation: WebConversation) => void;
  'web:conversation:updated': (conversation: WebConversation) => void;
  'web:message:new': (message: WebMessage) => void;
  'web:message:read': (conversationId: number, messageId: number) => void;
  'web:visitor:online': (visitor: WebVisitor) => void;
  'web:visitor:offline': (visitorId: number) => void;
  'web:typing:start': (conversationId: number, visitorId: number) => void;
  'web:typing:stop': (conversationId: number, visitorId: number) => void;
  
  // General events
  'notification': (notification: { type: 'info' | 'success' | 'warning' | 'error'; message: string }) => void;
}

// Request/Response DTOs
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface SendMessageRequest {
  contactId: string;
  content: string;
  messageType?: 'text' | 'image' | 'video' | 'audio' | 'document';
}

export interface ScheduleMessageRequest {
  contactId: number;
  content: string;
  messageType?: 'text' | 'image' | 'video' | 'audio' | 'document';
  scheduledTime: string;
}

// Web Chat específico
export interface WebVisitor {
  id: number;
  user_id: number;
  session_id: string;
  name?: string;
  email?: string;
  phone?: string;
  ip_address?: string;
  user_agent?: string;
  location?: string;
  is_online: boolean;
  last_seen: string;
  created_at: string;
}

export interface WebConversation {
  id: number;
  public_id: string;
  user_id: number;
  visitor_id: number;
  title: string;
  status: 'active' | 'closed' | 'pending' | 'resolved';
  assigned_to?: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  tags: string[];
  metadata: Record<string, any>;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  visitor?: WebVisitor;
  assigned_user?: User;
  unread_count?: number;
}

export interface WebMessage {
  id: number;
  conversation_id: number;
  sender_type: 'visitor' | 'agent' | 'system';
  sender_id?: number;
  content: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'emoji' | 'typing';
  is_read: boolean;
  metadata: Record<string, any>;
  created_at: string;
  sender_name?: string;
}

export interface WebChatStats {
  total_conversations: number;
  active_conversations: number;
  closed_conversations: number;
  total_messages: number;
  online_visitors: number;
  average_response_time: number;
  satisfaction_score?: number;
}

export interface WebChatWidgetConfig {
  user_id: number;
  widget_id: string;
  title: string;
  subtitle: string;
  primary_color: string;
  position: 'bottom-right' | 'bottom-left';
  show_avatar: boolean;
  show_typing: boolean;
  enable_sound: boolean;
  welcome_message: string;
  offline_message: string;
  business_hours: {
    enabled: boolean;
    timezone: string;
    schedule: Array<{
      day: string;
      start: string;
      end: string;
    }>;
  };
}

// Web Chat Request/Response DTOs
export interface CreateWebConversationRequest {
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
}

export interface SendWebMessageRequest {
  conversation_id: number;
  content: string;
  message_type?: 'text' | 'image' | 'video' | 'audio' | 'file' | 'emoji';
  metadata?: Record<string, any>;
}

export interface UpdateWebConversationRequest {
  status?: 'active' | 'closed' | 'pending' | 'resolved';
  assigned_to?: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface WebChatWidgetScriptRequest {
  user_id: number;
  domain?: string;
}

// ========================================
// SISTEMA DE ASISTENTES - NUEVOS TIPOS
// ========================================

// Asistente mejorado
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

// Asignaciones de asistentes
export interface AssistantAssignment {
  id: number;
  assistant_id: number;
  conversation_id: string;
  platform: 'whatsapp' | 'web' | 'facebook' | 'instagram' | 'telegram';
  assigned_at: string;
  is_active: boolean;
  assignment_type: 'automatic' | 'manual';
  created_at: string;
  updated_at: string;
  assistant?: Assistant;
}

// Plantillas de respuestas
export interface ResponseTemplate {
  id: number;
  assistant_id: number;
  user_id: number;
  name: string;
  content: string;
  category: TemplateCategory;
  trigger_keywords: string[];
  conditions?: Record<string, any>;
  is_active: boolean;
  priority: number;
  response_delay: number;
  created_at: string;
  updated_at: string;
  assistant?: Assistant;
}

// Sistema de etiquetas
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

// Etiquetas de conversaciones
export interface ConversationTag {
  conversation_id: string;
  tag_id: number;
  created_at: string;
  tag?: Tag;
}

// Historial de interacciones
export interface InteractionHistory {
  id: number;
  contact_id: number;
  conversation_id: string;
  interaction_type: 'message' | 'call' | 'meeting' | 'email' | 'note';
  content?: string;
  metadata?: Record<string, any>;
  created_at: string;
  contact?: Contact;
}

// Notas de contactos
export interface ContactNote {
  id: number;
  contact_id: number;
  user_id: number;
  content: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  contact?: Contact;
  user?: User;
}

// Configuración de asistentes
export interface AssistantConfig {
  id: number;
  assistant_id: number;
  config_key: string;
  config_value: Record<string, any>;
  created_at: string;
  updated_at: string;
  assistant?: Assistant;
}

// ========================================
// REQUEST/RESPONSE DTOs PARA ASISTENTES
// ========================================

export interface CreateAssistantRequest {
  name: string;
  description?: string;
  prompt?: string;
  is_active?: boolean;
  openai_api_key?: string;
  model?: string;
  max_tokens?: number;
  temperature?: number;
  auto_assign?: boolean;
  response_delay?: number;
}

export interface UpdateAssistantRequest extends Partial<CreateAssistantRequest> {
  id: number;
}

export interface CreateResponseTemplateRequest {
  assistant_id: number;
  name: string;
  content: string;
  trigger_keywords?: string[];
  conditions?: Record<string, any>;
  is_active?: boolean;
}

export interface UpdateResponseTemplateRequest extends Partial<CreateResponseTemplateRequest> {
  id: number;
}

export interface CreateTagRequest {
  name: string;
  color?: string;
}

export interface UpdateTagRequest extends Partial<CreateTagRequest> {
  id: number;
}

export interface AssignAssistantRequest {
  assistant_id: number;
  conversation_id: string;
  platform: 'whatsapp' | 'web' | 'facebook' | 'instagram' | 'telegram';
  assignment_type?: 'automatic' | 'manual';
}

export interface CreateContactNoteRequest {
  contact_id: number;
  content: string;
  is_private?: boolean;
}

export interface UpdateContactNoteRequest extends Partial<CreateContactNoteRequest> {
  id: number;
}

export interface CreateInteractionRequest {
  contact_id: number;
  conversation_id: string;
  interaction_type: 'message' | 'call' | 'meeting' | 'email' | 'note';
  content?: string;
  metadata?: Record<string, any>;
}

// ========================================
// CONFIGURACIÓN DE ASISTENTES
// ========================================

export interface AssistantConfigKey {
  response_delay_seconds: number;
  max_conversation_length: number;
  auto_assign_keywords: string[];
  working_hours: {
    start: string;
    end: string;
    timezone: string;
  };
  business_hours: {
    enabled: boolean;
    timezone: string;
    schedule: Array<{
      day: string;
      start: string;
      end: string;
    }>;
  };
  fallback_message: string;
  max_retries: number;
  retry_delay: number;
}

// ========================================
// ESTADÍSTICAS DE ASISTENTES
// ========================================

export interface AssistantStats {
  assistant_id: number;
  total_conversations: number;
  active_conversations: number;
  total_messages: number;
  auto_responses: number;
  manual_responses: number;
  average_response_time: number;
  satisfaction_score?: number;
  most_used_templates: Array<{
    template_id: number;
    template_name: string;
    usage_count: number;
  }>;
  performance_by_hour: Array<{
    hour: number;
    conversations: number;
    response_time: number;
  }>;
}

// ========================================
// EVENTOS DE SOCKET PARA ASISTENTES
// ========================================

export interface AssistantSocketEvents {
  'assistant:assigned': (assignment: AssistantAssignment) => void;
  'assistant:unassigned': (conversationId: string, assistantId: number) => void;
  'assistant:response:generated': (conversationId: string, response: string, assistantId: number) => void;
  'assistant:response:sent': (conversationId: string, messageId: string, assistantId: number) => void;
  'assistant:error': (conversationId: string, error: string, assistantId: number) => void;
  'assistant:status:changed': (assistantId: number, isActive: boolean) => void;
}

// ========================================
// INTERFACES ADICIONALES PARA SERVICIOS
// ========================================

// Estadísticas de asignaciones
export interface AssignmentStats {
  total_assignments: number;
  active_assignments: number;
  whatsapp_assignments: number;
  web_assignments: number;
  today_assignments: number;
}

// Categorías de plantillas
export type TemplateCategory = 
  | 'greeting' 
  | 'farewell' 
  | 'information' 
  | 'support' 
  | 'sales' 
  | 'general';

// Etiquetas de contactos
export interface ContactTag {
  contact_id: number;
  tag_id: number;
  created_at: string;
  tag?: Tag;
  contact?: Contact;
}

// Configuración de OpenAI
export interface OpenAIConfig {
  apiKey: string;
  baseURL?: string;
}

// Respuesta de procesamiento automático
export interface AutoResponseResult {
  shouldRespond: boolean;
  response?: string;
  templateUsed?: ResponseTemplate;
  assistantUsed?: Assistant;
}

// Estadísticas de respuestas automáticas
export interface AutoResponseStats {
  total_responses: number;
  responses_today: number;
  responses_by_assistant: Array<{ assistant_id: number; assistant_name: string; count: number }>;
  responses_by_template: Array<{ template_id: number; template_name: string; count: number }>;
}

// Estadísticas de etiquetas
export interface TagStats {
  total_tags: number;
  active_tags: number;
  most_used_tags: Array<{ tag_id: number; tag_name: string; count: number }>;
}

// Estadísticas de plantillas
export interface TemplateStats {
  total_templates: number;
  active_templates: number;
  templates_by_category: Record<string, number>;
}
