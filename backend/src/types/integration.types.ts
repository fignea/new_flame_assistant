export interface Integration {
  id: string;
  user_id: string;
  platform: 'whatsapp' | 'facebook' | 'instagram' | 'telegram';
  status: 'active' | 'inactive' | 'error';
  credentials: Record<string, any>;
  webhook_url?: string;
  last_sync?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateIntegrationRequest {
  platform: 'whatsapp' | 'facebook' | 'instagram' | 'telegram';
  credentials: Record<string, any>;
  webhook_url?: string;
}

export interface UpdateIntegrationRequest {
  credentials?: Record<string, any>;
  webhook_url?: string;
}

export interface WhatsAppCredentials {
  access_token: string;
  phone_id: string;
  verify_token: string;
}

export interface FacebookCredentials {
  app_id: string;
  app_secret: string;
  access_token: string;
}

export interface InstagramCredentials {
  access_token: string;
  user_id: string;
}

export interface TelegramCredentials {
  bot_token: string;
  webhook_url?: string;
}

export interface WebhookPayload {
  platform: string;
  data: Record<string, any>;
  timestamp: Date;
}
