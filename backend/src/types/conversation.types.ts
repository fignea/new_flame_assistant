export interface Conversation {
  id: string;
  user_id: string;
  contact_name: string;
  contact_phone?: string;
  contact_email?: string;
  platform: 'whatsapp' | 'facebook' | 'instagram' | 'telegram';
  status: 'active' | 'pending' | 'resolved' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_assistant_id?: string;
  last_message?: string;
  last_message_time?: Date;
  unread_count: number;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  sender: 'user' | 'assistant' | 'agent';
  type: 'text' | 'image' | 'file' | 'audio' | 'video';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface CreateConversationRequest {
  contact_name: string;
  contact_phone?: string;
  contact_email?: string;
  platform: 'whatsapp' | 'facebook' | 'instagram' | 'telegram';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigned_assistant_id?: string;
  tags?: string[];
}

export interface UpdateConversationRequest {
  status?: 'active' | 'pending' | 'resolved' | 'archived';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigned_assistant_id?: string;
  tags?: string[];
}

export interface SendMessageRequest {
  content: string;
  type?: 'text' | 'image' | 'file' | 'audio' | 'video';
  metadata?: Record<string, any>;
}

export interface ConversationFilters {
  status?: string;
  platform?: string;
  priority?: string;
  assigned_assistant_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}
