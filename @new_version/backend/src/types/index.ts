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
