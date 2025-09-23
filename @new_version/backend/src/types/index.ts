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
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker';
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
