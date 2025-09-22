import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as QRCode from 'qrcode';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { WhatsAppSessionModel, WhatsAppSessionData } from '../models/whatsapp-session.model';

export interface WhatsAppSession {
  id: string;
  userId: string;
  qrCode?: string;
  isConnected: boolean;
  isAuthenticated: boolean;
  phoneNumber?: string;
  name?: string;
  lastSeen?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class WhatsAppService extends EventEmitter {
  private client: Client | null = null;
  private sessions: Map<string, WhatsAppSession> = new Map();
  private qrCodeCache: Map<string, string> = new Map();

  constructor() {
    super();
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.on('qr', (sessionId: string, qr: string) => {
      logger.info(`QR Code generated for session ${sessionId}`);
      this.qrCodeCache.set(sessionId, qr);
      this.emit('qrCodeGenerated', sessionId, qr);
    });

    this.on('ready', (sessionId: string) => {
      logger.info(`WhatsApp client ready for session ${sessionId}`);
      const session = this.sessions.get(sessionId);
      if (session) {
        session.isConnected = true;
        session.isAuthenticated = true;
        session.updatedAt = new Date();
      }
      this.emit('sessionReady', sessionId);
    });

    this.on('authenticated', (sessionId: string) => {
      logger.info(`WhatsApp client authenticated for session ${sessionId}`);
      const session = this.sessions.get(sessionId);
      if (session) {
        session.isAuthenticated = true;
        session.updatedAt = new Date();
      }
    });

    this.on('auth_failure', (sessionId: string, msg: string) => {
      logger.error(`WhatsApp authentication failed for session ${sessionId}: ${msg}`);
      const session = this.sessions.get(sessionId);
      if (session) {
        session.isConnected = false;
        session.isAuthenticated = false;
        session.updatedAt = new Date();
      }
      this.emit('sessionFailed', sessionId, msg);
    });

    this.on('disconnected', (sessionId: string, reason: string) => {
      logger.warn(`WhatsApp client disconnected for session ${sessionId}: ${reason}`);
      const session = this.sessions.get(sessionId);
      if (session) {
        session.isConnected = false;
        session.updatedAt = new Date();
      }
      this.emit('sessionDisconnected', sessionId, reason);
    });
  }

  async createSession(userId: string): Promise<{ sessionId: string; qrCode?: string }> {
    try {
      const sessionId = `whatsapp_${userId}_${Date.now()}`;
      
      // Crear sesión en memoria
      const session: WhatsAppSession = {
        id: sessionId,
        userId,
        isConnected: false,
        isAuthenticated: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.sessions.set(sessionId, session);

      // Generar QR Code de prueba
      const qrCodeDataURL = await QRCode.toDataURL('whatsapp-web-demo', {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      session.qrCode = qrCodeDataURL;

      logger.info(`WhatsApp session created for user ${userId}: ${sessionId}`);
      
      return {
        sessionId,
        qrCode: session.qrCode
      };

    } catch (error) {
      logger.error('Error creating WhatsApp session:', error);
      throw new Error('Failed to create WhatsApp session');
    }
  }

  async getSession(sessionId: string): Promise<WhatsAppSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  async getSessionByUserId(userId: string): Promise<WhatsAppSession | null> {
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        return session;
      }
    }
    return null;
  }

  async getQRCode(sessionId: string): Promise<string | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Si ya tenemos el QR code, devolverlo
    if (session.qrCode) {
      return session.qrCode;
    }

    // Si tenemos el QR en cache, generar la imagen
    const qrData = this.qrCodeCache.get(sessionId);
    if (qrData) {
      try {
        const qrCodeDataURL = await QRCode.toDataURL(qrData, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        session.qrCode = qrCodeDataURL;
        return qrCodeDataURL;
      } catch (error) {
        logger.error('Error generating QR code:', error);
        return null;
      }
    }

    return null;
  }

  async sendMessage(sessionId: string, to: string, message: string): Promise<boolean> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session || !session.isConnected || !this.client) {
        throw new Error('WhatsApp session not connected');
      }

      // Formatear número de teléfono (agregar código de país si no está presente)
      const formattedNumber = to.includes('@c.us') ? to : `${to}@c.us`;
      
      await this.client.sendMessage(formattedNumber, message);
      
      logger.info(`Message sent to ${formattedNumber} via session ${sessionId}`);
      return true;

    } catch (error) {
      logger.error('Error sending WhatsApp message:', error);
      return false;
    }
  }

  async sendMediaMessage(sessionId: string, to: string, media: MessageMedia, caption?: string): Promise<boolean> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session || !session.isConnected || !this.client) {
        throw new Error('WhatsApp session not connected');
      }

      const formattedNumber = to.includes('@c.us') ? to : `${to}@c.us`;
      
      await this.client.sendMessage(formattedNumber, media, { caption });
      
      logger.info(`Media message sent to ${formattedNumber} via session ${sessionId}`);
      return true;

    } catch (error) {
      logger.error('Error sending WhatsApp media message:', error);
      return false;
    }
  }

  async getChats(sessionId: string): Promise<any[]> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session || !session.isConnected || !this.client) {
        throw new Error('WhatsApp session not connected');
      }

      const chats = await this.client.getChats();
      return chats.map(chat => ({
        id: chat.id._serialized,
        name: chat.name,
        isGroup: chat.isGroup,
        unreadCount: chat.unreadCount,
        lastMessage: chat.lastMessage ? {
          body: chat.lastMessage.body,
          timestamp: chat.timestamp,
          from: chat.lastMessage.from
        } : null
      }));

    } catch (error) {
      logger.error('Error getting WhatsApp chats:', error);
      return [];
    }
  }

  async getMessages(sessionId: string, chatId: string, limit: number = 50): Promise<any[]> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session || !session.isConnected || !this.client) {
        throw new Error('WhatsApp session not connected');
      }

      const chat = await this.client.getChatById(chatId);
      const messages = await chat.fetchMessages({ limit });
      
      return messages.map(message => ({
        id: message.id._serialized,
        body: message.body,
        from: message.from,
        to: message.to,
        timestamp: message.timestamp,
        type: message.type,
        isForwarded: message.isForwarded,
        hasMedia: message.hasMedia,
        media: message.hasMedia ? {
          mimetype: (message as any)._data?.mimetype,
          filename: (message as any)._data?.filename,
          caption: (message as any)._data?.caption
        } : null
      }));

    } catch (error) {
      logger.error('Error getting WhatsApp messages:', error);
      return [];
    }
  }

  async disconnectSession(sessionId: string): Promise<boolean> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session || !this.client) {
        return false;
      }

      await this.client.destroy();
      this.sessions.delete(sessionId);
      this.qrCodeCache.delete(sessionId);

      logger.info(`WhatsApp session ${sessionId} disconnected`);
      return true;

    } catch (error) {
      logger.error('Error disconnecting WhatsApp session:', error);
      return false;
    }
  }

  async getConnectionStatus(sessionId: string): Promise<{
    isConnected: boolean;
    isAuthenticated: boolean;
    phoneNumber?: string;
    name?: string;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        isConnected: false,
        isAuthenticated: false
      };
    }

    return {
      isConnected: session.isConnected,
      isAuthenticated: session.isAuthenticated,
      phoneNumber: session.phoneNumber,
      name: session.name
    };
  }

  // Método para limpiar sesiones inactivas
  async cleanupInactiveSessions(): Promise<void> {
    const now = new Date();
    const inactiveThreshold = 24 * 60 * 60 * 1000; // 24 horas

    for (const [sessionId, session] of this.sessions.entries()) {
      const timeSinceUpdate = now.getTime() - session.updatedAt.getTime();
      
      if (timeSinceUpdate > inactiveThreshold) {
        await this.disconnectSession(sessionId);
        logger.info(`Cleaned up inactive session: ${sessionId}`);
      }
    }
  }
}

// Instancia singleton
export const whatsappService = new WhatsAppService();
