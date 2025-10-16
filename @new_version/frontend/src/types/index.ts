// ========================================
// TIPOS MULTI-TENANT PARA FRONTEND
// ========================================

// ========================================
// ENUMS Y TIPOS
// ========================================

export type UserRole = 'owner' | 'admin' | 'manager' | 'agent' | 'viewer';
export type PlanType = 'starter' | 'pro' | 'enterprise';
export type TenantStatus = 'active' | 'suspended' | 'cancelled';
export type IntegrationType = 'whatsapp' | 'facebook' | 'instagram' | 'telegram' | 'web_chat';
export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'pending';
export type Platform = 'whatsapp' | 'facebook' | 'instagram' | 'web' | 'telegram';
export type ConversationStatus = 'active' | 'closed' | 'pending' | 'resolved';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
export type SenderType = 'user' | 'contact' | 'assistant' | 'system';
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'contact' | 'file';
export type AIProvider = 'openai' | 'anthropic' | 'local';
export type TemplateCategory = 'greeting' | 'farewell' | 'information' | 'support' | 'sales' | 'general';
export type AssignmentType = 'automatic' | 'manual';
export type InteractionType = 'message' | 'call' | 'meeting' | 'email' | 'note';

// ========================================
// INTERFACES DE ENTIDADES PRINCIPALES
// ========================================

export interface TenantLimits {
  max_users: number;
  max_contacts: number;
  max_conversations: number;
  max_messages?: number;
  max_storage?: number;
  features?: string[];
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  domain?: string;
  plan_type: PlanType;
  status: TenantStatus;
  settings: Record<string, any>;
  billing_info: Record<string, any>;
  limits: TenantLimits;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: Record<string, any>;
  profile: UserProfile;
  preferences: Record<string, any>;
  last_login_at?: string;
  is_active: boolean;
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface UserProfile {
  avatar?: string;
  phone?: string;
  timezone?: string;
  language?: string;
  bio?: string;
  department?: string;
}

export interface Integration {
  id: string;
  tenant_id: string;
  type: IntegrationType;
  name: string;
  status: IntegrationStatus;
  config: Record<string, any>;
  credentials: Record<string, any>;
  webhook_url?: string;
  last_sync_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  tenant_id: string;
  external_id: string;
  platform: Platform;
  name?: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  is_group: boolean;
  is_blocked: boolean;
  metadata: Record<string, any>;
  tags: string[];
  custom_fields: Record<string, any>;
  last_interaction_at?: string;
  interaction_count: number;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  tenant_id: string;
  contact_id: string;
  platform: Platform;
  external_conversation_id: string;
  title?: string;
  status: ConversationStatus;
  priority: Priority;
  assigned_to?: string;
  assistant_id?: string;
  tags: string[];
  metadata: Record<string, any>;
  last_message_at?: string;
  first_response_at?: string;
  resolution_time?: number;
  satisfaction_score?: number;
  created_at: string;
  updated_at: string;
  contact?: Contact;
  assigned_user?: User;
  assistant?: Assistant;
  unread_count?: number;
}

export interface Assistant {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  prompt?: string;
  is_active: boolean;
  ai_provider: AIProvider;
  model: string;
  api_key_encrypted?: string;
  max_tokens: number;
  temperature: number;
  auto_assign: boolean;
  response_delay: number;
  working_hours: Record<string, any>;
  business_hours: Record<string, any>;
  fallback_message?: string;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Message {
  id: string;
  tenant_id: string;
  conversation_id: string;
  external_message_id: string;
  sender_type: SenderType;
  sender_id?: string;
  content: string;
  message_type: MessageType;
  media_url?: string;
  media_metadata: Record<string, any>;
  is_from_me: boolean;
  is_auto_response: boolean;
  template_id?: string;
  assistant_id?: string;
  status: MessageStatus;
  error_message?: string;
  quoted_message_id?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  sender?: User | Contact;
  template?: ResponseTemplate;
  assistant?: Assistant;
}

export interface ResponseTemplate {
  id: string;
  tenant_id: string;
  assistant_id?: string;
  name: string;
  content: string;
  category: TemplateCategory;
  trigger_keywords: string[];
  conditions: Record<string, any>;
  priority: number;
  response_delay: number;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  assistant?: Assistant;
}

export interface Tag {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  color: string;
  category: string;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface ScheduledMessage {
  id: string;
  tenant_id: string;
  conversation_id: string;
  content: string;
  message_type: MessageType;
  media_url?: string;
  scheduled_at: string;
  status: MessageStatus;
  sent_at?: string;
  error_message?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  conversation?: Conversation;
  creator?: User;
}

// ========================================
// INTERFACES DE REQUEST/RESPONSE
// ========================================

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

// ========================================
// REQUEST DTOs
// ========================================

export interface CreateTenantRequest {
  name: string;
  domain?: string;
  plan_type?: PlanType;
  settings?: Record<string, any>;
  billing_info?: Record<string, any>;
  limits?: Partial<TenantLimits>;
}

export interface UpdateTenantRequest extends Partial<CreateTenantRequest> {
  id: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  permissions?: Record<string, any>;
  profile?: UserProfile;
  preferences?: Record<string, any>;
}

export interface UpdateUserRequest extends Partial<CreateUserRequest> {
  id: string;
}

export interface CreateContactRequest {
  external_id: string;
  platform: Platform;
  name?: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  is_group?: boolean;
  metadata?: Record<string, any>;
  custom_fields?: Record<string, any>;
}

export interface UpdateContactRequest extends Partial<CreateContactRequest> {
  id: string;
}

export interface CreateConversationRequest {
  contact_id: string;
  platform: Platform;
  external_conversation_id: string;
  title?: string;
  priority?: Priority;
  assigned_to?: string;
  assistant_id?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateConversationRequest extends Partial<CreateConversationRequest> {
  id: string;
}

export interface CreateAssistantRequest {
  name: string;
  description?: string;
  prompt?: string;
  is_active?: boolean;
  ai_provider?: AIProvider;
  model?: string;
  api_key?: string;
  max_tokens?: number;
  temperature?: number;
  auto_assign?: boolean;
  response_delay?: number;
  working_hours?: Record<string, any>;
  business_hours?: Record<string, any>;
  fallback_message?: string;
  config?: Record<string, any>;
}

export interface UpdateAssistantRequest extends Partial<CreateAssistantRequest> {
  id: string;
}

export interface CreateMessageRequest {
  conversation_id: string;
  external_message_id: string;
  sender_type: SenderType;
  sender_id?: string;
  content: string;
  message_type?: MessageType;
  media_url?: string;
  media_metadata?: Record<string, any>;
  is_from_me?: boolean;
  is_auto_response?: boolean;
  template_id?: string;
  assistant_id?: string;
  quoted_message_id?: string;
  metadata?: Record<string, any>;
}

export interface UpdateMessageRequest extends Partial<CreateMessageRequest> {
  id: string;
}

export interface CreateResponseTemplateRequest {
  assistant_id?: string;
  name: string;
  content: string;
  category?: TemplateCategory;
  trigger_keywords?: string[];
  conditions?: Record<string, any>;
  priority?: number;
  response_delay?: number;
  is_active?: boolean;
}

export interface UpdateResponseTemplateRequest extends Partial<CreateResponseTemplateRequest> {
  id: string;
}

export interface CreateTagRequest {
  name: string;
  description?: string;
  color?: string;
  category?: string;
}

export interface UpdateTagRequest extends Partial<CreateTagRequest> {
  id: string;
}

export interface CreateScheduledMessageRequest {
  conversation_id: string;
  content: string;
  message_type?: MessageType;
  media_url?: string;
  scheduled_at: string;
}

export interface UpdateScheduledMessageRequest extends Partial<CreateScheduledMessageRequest> {
  id: string;
}

// ========================================
// INTERFACES DE AUTENTICACIÓN
// ========================================

export interface LoginRequest {
  email: string;
  password: string;
  tenant_slug?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  tenant_slug?: string;
  role?: UserRole;
}

export interface AuthResponse {
  user: Omit<User, 'password_hash'>;
  tenant: Tenant;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// ========================================
// INTERFACES DE FILTROS Y BÚSQUEDA
// ========================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface ContactFilters extends PaginationParams {
  platform?: Platform;
  is_group?: boolean;
  is_blocked?: boolean;
  tags?: string[];
  search?: string;
  last_interaction_after?: string;
  last_interaction_before?: string;
}

export interface ConversationFilters extends PaginationParams {
  status?: ConversationStatus;
  priority?: Priority;
  platform?: Platform;
  assigned_to?: string;
  assistant_id?: string;
  tags?: string[];
  search?: string;
  created_after?: string;
  created_before?: string;
}

export interface MessageFilters extends PaginationParams {
  conversation_id?: string;
  sender_type?: SenderType;
  message_type?: MessageType;
  is_auto_response?: boolean;
  assistant_id?: string;
  template_id?: string;
  status?: MessageStatus;
  created_after?: string;
  created_before?: string;
}

// ========================================
// INTERFACES DE ESTADÍSTICAS
// ========================================

export interface DashboardStats {
  assistants: {
    total: number;
    active: number;
    inactive: number;
  };
  conversations: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  messages: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  contacts: {
    total: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
  };
  templates: {
    total: number;
    active: number;
    categories: number;
  };
  tags: {
    total: number;
    active: number;
    conversations: number;
    contacts: number;
  };
  assignments: {
    total: number;
    autoAssigned: number;
    manualAssigned: number;
  };
}

export interface TenantStats {
  total_users: number;
  active_users: number;
  total_contacts: number;
  total_conversations: number;
  active_conversations: number;
  total_messages: number;
  messages_today: number;
  avg_response_time?: number;
  satisfaction_score?: number;
}

export interface AssistantStats {
  assistant_id: string;
  assistant_name: string;
  total_conversations: number;
  active_conversations: number;
  total_messages: number;
  auto_responses: number;
  manual_responses: number;
  avg_response_time?: number;
  satisfaction_score?: number;
  most_used_templates: Array<{
    template_id: string;
    template_name: string;
    usage_count: number;
  }>;
}

export interface TagStats {
  total_tags: number;
  active_tags: number;
  most_used_tags: Array<{
    tag_id: string;
    tag_name: string;
    count: number;
  }>;
}

// ========================================
// INTERFACES DE CONTEXTO
// ========================================

export interface AppContextType {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  updateTenant: (tenant: Partial<Tenant>) => void;
}

export interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

// ========================================
// INTERFACES DE SOCKET EVENTS
// ========================================

export interface SocketEvents {
  // Tenant events
  'tenant:created': (tenant: Tenant) => void;
  'tenant:updated': (tenant: Tenant) => void;
  'tenant:deleted': (tenantId: string) => void;
  
  // User events
  'user:created': (user: User) => void;
  'user:updated': (user: User) => void;
  'user:deleted': (userId: string) => void;
  'user:login': (user: User) => void;
  'user:logout': (userId: string) => void;
  
  // Contact events
  'contact:created': (contact: Contact) => void;
  'contact:updated': (contact: Contact) => void;
  'contact:deleted': (contactId: string) => void;
  
  // Conversation events
  'conversation:created': (conversation: Conversation) => void;
  'conversation:updated': (conversation: Conversation) => void;
  'conversation:assigned': (conversationId: string, userId: string) => void;
  'conversation:unassigned': (conversationId: string) => void;
  
  // Message events
  'message:received': (message: Message) => void;
  'message:sent': (message: Message) => void;
  'message:delivered': (messageId: string) => void;
  'message:read': (messageId: string) => void;
  'message:failed': (messageId: string, error: string) => void;
  
  // Assistant events
  'assistant:created': (assistant: Assistant) => void;
  'assistant:updated': (assistant: Assistant) => void;
  'assistant:deleted': (assistantId: string) => void;
  'assistant:assigned': (assignment: any) => void;
  'assistant:unassigned': (conversationId: string, assistantId: string) => void;
  'assistant:response:generated': (conversationId: string, response: string, assistantId: string) => void;
  'assistant:response:sent': (conversationId: string, messageId: string, assistantId: string) => void;
  'assistant:error': (conversationId: string, error: string, assistantId: string) => void;
  
  // General events
  'notification': (notification: { type: 'info' | 'success' | 'warning' | 'error'; message: string; data?: any }) => void;
  'error': (error: { message: string; code?: string; details?: any }) => void;
}

// ========================================
// INTERFACES LEGACY (COMPATIBILIDAD)
// ========================================

// Mantener interfaces legacy para compatibilidad durante la migración
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

// Request/Response DTOs legacy
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
