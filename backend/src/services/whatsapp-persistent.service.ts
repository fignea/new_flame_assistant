import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as QRCode from 'qrcode';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { WhatsAppSessionModel } from '../models/whatsapp-session.model';

export interface WhatsAppSession {
  id: string;
  userId: string;
  sessionId: string;
  qrCode?: string;
  isConnected: boolean;
  isAuthenticated: boolean;
  phoneNumber?: string;
  userName?: string;
  lastSeen?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class WhatsAppPersistentService extends EventEmitter {
  private clients: Map<string, Client> = new Map(); // Map<sessionId_wwebjs, Client>
  private sessions: Map<string, WhatsAppSession> = new Map(); // Map<sessionId_wwebjs, WhatsAppSession>

  constructor() {
    super();
    this.setupEventHandlers();
    this.initializeExistingSessions();
  }

  private setupEventHandlers() {
    this.on('qr', (sessionId: string, qr: string) => this.handleQr(sessionId, qr));
    this.on('ready', (sessionId: string) => this.handleReady(sessionId));
    this.on('authenticated', (sessionId: string) => this.handleAuthenticated(sessionId));
    this.on('auth_failure', (sessionId: string, msg: string) => this.handleAuthFailure(sessionId, msg));
    this.on('disconnected', (sessionId: string, reason: string) => this.handleDisconnected(sessionId, reason));
  }

  private async handleQr(sessionId: string, qr: string) {
    logger.info(`QR RECEIVED for session ${sessionId}`);
    const qrCodeDataURL = await QRCode.toDataURL(qr, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    const session = this.sessions.get(sessionId);
    if (session) {
      session.qrCode = qrCodeDataURL;
      session.updatedAt = new Date();
      await this.updateSessionInDatabase(session);
    }
    
    this.emit('qr', sessionId, qrCodeDataURL);
  }

  private async handleReady(sessionId: string) {
    logger.info(`WhatsApp client is READY for session ${sessionId}`);
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isConnected = true;
      session.isAuthenticated = true;
      session.updatedAt = new Date();
      await this.updateSessionInfo(sessionId);
      await this.updateSessionInDatabase(session);
    }
    this.emit('ready', sessionId);
  }

  private async handleAuthenticated(sessionId: string) {
    logger.info(`WhatsApp client AUTHENTICATED for session ${sessionId}`);
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isAuthenticated = true;
      session.updatedAt = new Date();
      await this.updateSessionInDatabase(session);
    }
    this.emit('authenticated', sessionId);
  }

  private async handleAuthFailure(sessionId: string, msg: string) {
    logger.error(`WhatsApp client AUTH FAILURE for session ${sessionId}: ${msg}`);
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isConnected = false;
      session.isAuthenticated = false;
      session.updatedAt = new Date();
      await this.updateSessionInDatabase(session);
    }
    this.emit('auth_failure', sessionId, msg);
    await this.disconnectSession(sessionId);
  }

  private async handleDisconnected(sessionId: string, reason: string) {
    logger.warn(`WhatsApp client disconnected for session ${sessionId}: ${reason}`);
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isConnected = false;
      session.updatedAt = new Date();
      await this.updateSessionInDatabase(session);
    }
    this.emit('disconnected', sessionId, reason);
    await this.disconnectSession(sessionId);
  }

  private async updateSessionInfo(sessionId: string): Promise<void> {
    try {
      const client = this.clients.get(sessionId);
      const session = this.sessions.get(sessionId);
      if (!client || !session) return;

      if (!(client as any).isReady) return;

      const user = await (client as any).getMe();
      const contact = await (client as any).getContactById(user.wid._serialized);
      
      session.phoneNumber = user.wid.user;
      session.userName = contact.name || contact.pushname;
      session.lastSeen = new Date();
      session.updatedAt = new Date();

      await this.updateSessionInDatabase(session);

    } catch (error) {
      logger.error(`Error updating session info for ${sessionId}:`, error);
    }
  }

  private async updateSessionInDatabase(session: WhatsAppSession): Promise<void> {
    try {
      await WhatsAppSessionModel.update(session.id, {
        qrCode: session.qrCode,
        isConnected: session.isConnected,
        isAuthenticated: session.isAuthenticated,
        phoneNumber: session.phoneNumber,
        userName: session.userName,
        lastSeen: session.lastSeen
      });
    } catch (error) {
      logger.error(`Error updating session in database:`, error);
    }
  }

  private async initializeExistingSessions(): Promise<void> {
    try {
      logger.info('Initializing existing WhatsApp sessions...');
      const existingSessions = await WhatsAppSessionModel.getActiveSessions();
      
      for (const sessionData of existingSessions) {
        const session: WhatsAppSession = {
          id: sessionData.id,
          userId: sessionData.userId,
          sessionId: sessionData.sessionId,
          qrCode: sessionData.qrCode,
          isConnected: sessionData.isConnected,
          isAuthenticated: sessionData.isAuthenticated,
          phoneNumber: sessionData.phoneNumber,
          userName: sessionData.userName,
          lastSeen: sessionData.lastSeen,
          createdAt: sessionData.createdAt,
          updatedAt: sessionData.updatedAt
        };

        this.sessions.set(session.sessionId, session);
        
        // Intentar reconectar si estaba conectado
        if (session.isConnected) {
          await this.initializeClient(session.sessionId, session.userId);
        }
      }
      
      logger.info(`Initialized ${existingSessions.length} existing sessions`);
    } catch (error) {
      logger.error('Error initializing existing sessions:', error);
    }
  }

  async createSession(userId: string): Promise<{ sessionId: string; qrCode?: string }> {
    try {
      logger.info(`Creating persistent WhatsApp session for user: ${userId}`);
      logger.info(`User ID type: ${typeof userId}, length: ${userId.length}`);
      
      // Verificar si ya existe una sesión activa para el usuario
      const existingSession = await this.getSessionByUserId(userId);
      if (existingSession && existingSession.isConnected) {
        logger.info(`Existing active session found for user ${userId}: ${existingSession.sessionId}`);
        return {
          sessionId: existingSession.sessionId,
          qrCode: existingSession.qrCode
        };
      }

      const sessionId = `whatsapp_${userId}_${Date.now()}`;
      const now = new Date();

      const session: WhatsAppSession = {
        id: sessionId,
        userId,
        sessionId,
        isConnected: false,
        isAuthenticated: false,
        createdAt: now,
        updatedAt: now
      };

      this.sessions.set(sessionId, session);

      logger.info(`Creating session in database with userId: ${userId}`);
      
      // Guardar en base de datos
      const dbSession = await WhatsAppSessionModel.create({
        userId: userId,
        sessionId: sessionId,
        qrCode: undefined,
        isConnected: false,
        isAuthenticated: false,
        phoneNumber: undefined,
        userName: undefined,
        lastSeen: undefined,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
      });
      
      logger.info(`Session created in database with ID: ${dbSession.id}`);

      await this.initializeClient(sessionId, userId);

      logger.info(`Persistent WhatsApp session created: ${sessionId}`);
      
      return {
        sessionId,
        qrCode: session.qrCode // El QR se establecerá cuando el cliente esté listo
      };

    } catch (error) {
      logger.error('Error creating persistent WhatsApp session:', error);
      logger.error('Error details:', error);
      throw new Error('Failed to create persistent WhatsApp session');
    }
  }

  private async initializeClient(sessionId: string, userId: string): Promise<void> {
    try {
      logger.info(`Initializing WhatsApp client for session ${sessionId}...`);
      
      // Por ahora, simular la inicialización para demostrar la funcionalidad
      // En producción, esto se ejecutaría con Puppeteer real
      logger.info(`Simulating WhatsApp Web initialization for session ${sessionId}...`);
      
      // Simular la generación de QR después de un delay
      setTimeout(async () => {
        try {
          const testQR = await QRCode.toDataURL(`whatsapp-web-${Date.now()}`, {
            width: 300,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          
          const session = this.sessions.get(sessionId);
          if (session) {
            session.qrCode = testQR;
            session.updatedAt = new Date();
            await this.updateSessionInDatabase(session);
          }
          
          logger.info(`QR Code generated for session ${sessionId}`);
          this.emit('qr', sessionId, testQR);
        } catch (error) {
          logger.error(`Error generating QR for session ${sessionId}:`, error);
        }
      }, 2000); // 2 segundos de delay para simular inicialización
      
      // Simular conexión después de más tiempo
      setTimeout(() => {
        const session = this.sessions.get(sessionId);
        if (session) {
          session.isConnected = true;
          session.isAuthenticated = true;
          session.phoneNumber = '+1234567890';
          session.userName = 'Test User';
          session.updatedAt = new Date();
          this.updateSessionInDatabase(session);
        }
        logger.info(`WhatsApp Web simulated connection for session ${sessionId}`);
        this.emit('ready', sessionId);
      }, 10000); // 10 segundos para simular conexión
      
      return;

    } catch (error) {
      logger.error(`Error setting up WhatsApp client for session ${sessionId}:`, error);
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<WhatsAppSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  async getSessionByUserId(userId: string): Promise<WhatsAppSession | null> {
    for (const [id, session] of this.sessions) {
      if (session.userId === userId) {
        return session;
      }
    }
    return null;
  }

  async getQRCode(sessionId: string): Promise<string | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    if (session.qrCode) {
      return session.qrCode;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off('qr', qrListener);
        reject(new Error('Timeout waiting for QR code'));
      }, 30000); // 30 segundos de timeout

      const qrListener = (sId: string, qr: string) => {
        if (sId === sessionId) {
          clearTimeout(timeout);
          this.off('qr', qrListener);
          resolve(qr);
        }
      };
      
      this.on('qr', qrListener);
    });
  }

  async getConnectionStatus(sessionId: string): Promise<{ isConnected: boolean; isAuthenticated: boolean; phoneNumber?: string; userName?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { isConnected: false, isAuthenticated: false };
    }
    return {
      isConnected: session.isConnected,
      isAuthenticated: session.isAuthenticated,
      phoneNumber: session.phoneNumber,
      userName: session.userName
    };
  }

  async disconnectSession(sessionId: string): Promise<boolean> {
    const client = this.clients.get(sessionId);
    if (client) {
      try {
        await client.destroy();
        this.clients.delete(sessionId);
        this.sessions.delete(sessionId);
        
        // Eliminar de base de datos
        await WhatsAppSessionModel.deleteBySessionId(sessionId);
        
        logger.info(`Session ${sessionId} disconnected and destroyed.`);
        return true;
      } catch (error) {
        logger.error(`Error disconnecting session ${sessionId}:`, error);
        return false;
      }
    }
    return false;
  }

  async sendMessage(sessionId: string, to: string, message: string | any): Promise<any> {
    const client = this.clients.get(sessionId);
    if (!client || !(client as any).isReady) {
      throw new Error('WhatsApp client not ready or not connected');
    }

    try {
      const chat = await client.getChatById(to);
      const sentMessage = await chat.sendMessage(message);
      logger.info(`Message sent to ${to} from session ${sessionId}`);
      return sentMessage;
    } catch (error) {
      logger.error(`Error sending message to ${to} from session ${sessionId}:`, error);
      throw error;
    }
  }

  async getChats(sessionId: string): Promise<any[]> {
    const client = this.clients.get(sessionId);
    if (!client || !(client as any).isReady) {
      throw new Error('WhatsApp client not ready or not connected');
    }

    try {
      const chats = await client.getChats();
      return chats.map(chat => ({
        id: chat.id._serialized,
        name: chat.name,
        isGroup: chat.isGroup,
        unreadCount: chat.unreadCount,
        lastMessage: chat.lastMessage ? {
          body: chat.lastMessage.body,
          timestamp: chat.lastMessage.timestamp,
          from: chat.lastMessage.from
        } : undefined
      }));
    } catch (error) {
      logger.error('Error getting WhatsApp chats:', error);
      return [];
    }
  }

  async getMessages(sessionId: string, chatId: string, limit: number = 20): Promise<any[]> {
    const client = this.clients.get(sessionId);
    if (!client || !(client as any).isReady) {
      throw new Error('WhatsApp client not ready or not connected');
    }

    try {
      const chat = await client.getChatById(chatId);
      const messages = await chat.fetchMessages({ limit });
      return messages.map(message => ({
        id: message.id.id,
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

  async getSessionStats(): Promise<{ total: number; active: number; expired: number }> {
    const total = this.sessions.size;
    let active = 0;
    let expired = 0;
    
    for (const session of this.sessions.values()) {
      if (session.isConnected) {
        active++;
      } else {
        expired++;
      }
    }
    
    return { total, active, expired };
  }

  async cleanupExpiredSessions(): Promise<number> {
    let cleanedCount = 0;
    const sessionsToDelete: string[] = [];
    
    for (const [id, session] of this.sessions) {
      if (!session.isConnected) {
        sessionsToDelete.push(id);
      }
    }
    
    for (const id of sessionsToDelete) {
      await this.disconnectSession(id);
      cleanedCount++;
    }
    
    return cleanedCount;
  }
}

export const whatsappPersistentService = new WhatsAppPersistentService();