import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  WASocket, 
  proto,
  WAMessage,
  WAMessageKey,
  Chat,
  WAMessageContent,
  MessageUpsertType,
  BaileysEventMap
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

// Interfaces para mensajes y chats
export interface WhatsAppMessage {
  id: string;
  key: WAMessageKey;
  message: WAMessageContent;
  messageTimestamp: number;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  fromMe: boolean;
  chatId: string;
  senderId: string;
  senderName?: string;
  body?: string;
  type: string;
  hasMedia: boolean;
  media?: {
    mimetype?: string;
    filename?: string;
    caption?: string;
    url?: string;
  };
  quotedMessage?: WhatsAppMessage;
  contextInfo?: any;
}

export interface WhatsAppChat {
  id: string;
  name: string;
  isGroup: boolean;
  isReadOnly: boolean;
  unreadCount: number;
  lastMessage?: WhatsAppMessage;
  participants: string[];
  createdAt: number;
  updatedAt: number;
  archived: boolean;
  pinned: boolean;
  ephemeralExpiration?: number;
  ephemeralSettingTimestamp?: number;
}

export interface WhatsAppSession {
  sessionId: string;
  userId: string;
  socket: WASocket | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  phoneNumber?: string;
  userName?: string;
  lastSeen?: Date;
  createdAt: Date;
  qrCode?: string;
}

export interface MessageHandler {
  (message: WhatsAppMessage): void | Promise<void>;
}

export class WhatsAppMessageService extends EventEmitter {
  private sessions: Map<string, WhatsAppSession> = new Map();
  private messageHandlers: Map<string, MessageHandler[]> = new Map();

  private chatCache: Map<string, WhatsAppChat> = new Map();
  private messageCache: Map<string, WhatsAppMessage[]> = new Map();

  constructor() {
    super();
    logger.info('WhatsAppMessageService initialized');
    this.setupGlobalEventHandlers();
  }

  private setupGlobalEventHandlers() {
    // Limpiar cache periódicamente
    setInterval(() => {
      this.cleanupCache();
    }, 5 * 60 * 1000); // Cada 5 minutos
  }

  // Crear nueva sesión con gestión de mensajes
  async createSession(userId: string): Promise<{ sessionId: string; qrCode?: string }> {
    const sessionId = `whatsapp_${userId}_${Date.now()}`;
    
    logger.info(`Creating WhatsApp session with message management for user: ${userId}`);
    
    // Verificar si ya hay una sesión activa
    const existingSession = this.sessions.get(userId);
    if (existingSession && existingSession.isConnected) {
      logger.info(`Session ${userId} already active and connected`);
      return { 
        sessionId: existingSession.sessionId, 
        qrCode: existingSession.qrCode 
      };
    }

    try {
      // Solo limpiar sesión anterior si no está conectada
      if (this.sessions.has(userId)) {
        const currentSession = this.sessions.get(userId);
        if (currentSession && !currentSession.isConnected) {
          logger.info(`Cleaning up disconnected session for user ${userId}`);
          this.cleanupSession(userId);
        } else if (currentSession && currentSession.isConnected) {
          logger.info(`Session ${userId} is already connected, returning existing session`);
          return { 
            sessionId: currentSession.sessionId, 
            qrCode: currentSession.qrCode 
          };
        }
      }

      // Crear nueva sesión
      const session: WhatsAppSession = {
        sessionId,
        userId,
        socket: null,
        isConnected: false,
        isAuthenticated: false,
        createdAt: new Date()
      };

      this.sessions.set(userId, session);

      // Inicializar Baileys en background
      this.initializeBaileysSession(userId, sessionId).catch(error => {
        logger.error(`Error initializing Baileys session for user ${userId}:`, error);
      });

      return { sessionId };
    } catch (error) {
      logger.error(`Error creating session for user ${userId}:`, error);
      throw error;
    }
  }

  // Inicializar sesión de Baileys con gestión de mensajes
  private async initializeBaileysSession(userId: string, sessionId: string): Promise<void> {
    try {
      logger.info(`Initializing Baileys session with message handling for user ${userId}`);
      
      const authFolder = path.resolve(process.cwd(), `sessions/${userId}`);
      logger.info(`Auth folder: ${authFolder}`);
      const { state, saveCreds } = await useMultiFileAuthState(authFolder);
      logger.info(`Auth state loaded for user ${userId}`);

      logger.info(`Creating Baileys socket for user ${userId}`);
      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['FlameAI', 'Chrome', '110.0.0.0'],
        connectTimeoutMs: 120000, // Aumentar timeout a 2 minutos
        keepAliveIntervalMs: 10000, // Reducir intervalo de keep alive
        retryRequestDelayMs: 1000, // Reducir delay entre reintentos
        generateHighQualityLinkPreview: true,
        markOnlineOnConnect: true,
        syncFullHistory: false,
        defaultQueryTimeoutMs: 60000, // Timeout para queries
        qrTimeout: 120000, // Timeout específico para QR
        logger: undefined // Deshabilitar logger para reducir spam
      });
      logger.info(`Baileys socket created for user ${userId}`);

      // Actualizar sesión con socket
      const session = this.sessions.get(userId);
      if (session) {
        session.socket = sock;
      }

      // Configurar event handlers
      this.setupSocketEventHandlers(sock, userId);

      logger.info(`Socket created and configured for user ${userId}`);

    } catch (error) {
      logger.error(`Error initializing Baileys session for user ${userId}:`, error);
    }
  }

  // Configurar event handlers del socket
  private setupSocketEventHandlers(sock: WASocket, userId: string) {
    // Conexión
    sock.ev.on('connection.update', (update) => {
      this.handleConnectionUpdate(update, userId);
    });

    // Credenciales
    sock.ev.on('creds.update', () => {
      // saveCreds se maneja automáticamente
    });

    // Mensajes
    sock.ev.on('messages.upsert', (m) => {
      this.handleMessagesUpsert(m, userId);
    });

    // Actualizaciones de mensajes (estados, etc.)
    sock.ev.on('messages.update', (updates) => {
      this.handleMessagesUpdate(updates, userId);
    });

    // Chats
    sock.ev.on('chats.upsert', (chats: Chat[]) => {
      this.handleChatsUpsert(chats, userId);
    });

    // Actualizaciones de chats
    sock.ev.on('chats.update', (updates) => {
      this.handleChatsUpdate(updates, userId);
    });

    // Presencia
    sock.ev.on('presence.update', (update) => {
      this.handlePresenceUpdate(update, userId);
    });

    // Grupos
    sock.ev.on('groups.update', (updates) => {
      this.handleGroupsUpdate(updates, userId);
    });
  }

  // Manejar actualizaciones de conexión
  private handleConnectionUpdate(update: any, userId: string) {
    const { connection, lastDisconnect, qr } = update;
    const session = this.sessions.get(userId);
    
    if (!session) return;

    logger.info(`Connection update for user ${userId}: ${connection}, QR: ${!!qr}`);

    if (qr) {
      logger.info(`QR code received for user ${userId} - Length: ${qr.length}`);
      session.qrCode = qr;
      session.isConnected = false;
      session.isAuthenticated = false;
      this.emit('qr', userId, qr);
    }

    if (connection === 'close') {
      logger.info(`Connection closed for user ${userId}`);
      session.isConnected = false;
      session.isAuthenticated = false;
      
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      
      if (shouldReconnect) {
        logger.info(`Reconnecting session for user ${userId} in 3 seconds`);
        setTimeout(() => {
          this.initializeBaileysSession(userId, session.sessionId);
        }, 3000);
      } else {
        logger.info(`Session permanently closed for user ${userId}`);
        this.cleanupSession(userId);
      }
    }

    if (connection === 'open') {
      logger.info(`WhatsApp connected for user ${userId}`);
      session.isConnected = true;
      session.isAuthenticated = true;
      
      if (session.socket?.user) {
        session.phoneNumber = session.socket.user.id.split('@')[0];
        session.userName = session.socket.user.name || 'Usuario Conectado';
        logger.info(`User info: ${session.phoneNumber} - ${session.userName}`);
      }
      
      session.lastSeen = new Date();
      session.qrCode = undefined;
      
      this.emit('connected', userId);
    }

    if (connection === 'connecting') {
      logger.info(`Connecting to WhatsApp for user ${userId}`);
    }
  }

  // Manejar mensajes entrantes
  private async handleMessagesUpsert(m: { messages: WAMessage[]; type: MessageUpsertType }, userId: string) {
    const session = this.sessions.get(userId);
    if (!session || !session.socket) return;

    for (const message of m.messages) {
      try {
        const whatsappMessage = await this.convertToWhatsAppMessage(message, session.socket);
        if (whatsappMessage) {
          // Guardar en cache
          this.saveMessageToCache(whatsappMessage);
          
          // Emitir evento
          this.emit('message', userId, whatsappMessage);
          
          // Ejecutar handlers registrados
          const handlers = this.messageHandlers.get(userId) || [];
          for (const handler of handlers) {
            try {
              await handler(whatsappMessage);
            } catch (error) {
              logger.error(`Error in message handler for user ${userId}:`, error);
            }
          }
        }
      } catch (error) {
        logger.error(`Error processing message for user ${userId}:`, error);
      }
    }
  }

  // Manejar actualizaciones de mensajes
  private handleMessagesUpdate(updates: proto.IWebMessageInfo[], userId: string) {
    for (const update of updates) {
      if (update.key) {
        const messageId = this.getMessageId(update.key);
        const cachedMessages = this.messageCache.get(update.key.remoteJid || '') || [];
        const messageIndex = cachedMessages.findIndex(msg => msg.id === messageId);
        
        if (messageIndex !== -1) {
          // Actualizar estado del mensaje
          if (update.status) {
            cachedMessages[messageIndex].status = update.status as any;
          }
          
          this.emit('messageUpdate', userId, cachedMessages[messageIndex]);
        }
      }
    }
  }

  // Manejar chats
  private handleChatsUpsert(chats: Chat[], userId: string) {
    for (const chat of chats) {
      const whatsappChat = this.convertToWhatsAppChat(chat);
      this.chatCache.set(chat.id, whatsappChat);
      this.emit('chat', userId, whatsappChat);
    }
  }

  // Manejar actualizaciones de chats
  private handleChatsUpdate(updates: Partial<Chat>[], userId: string) {
    for (const update of updates) {
      if (update.id) {
        const existingChat = this.chatCache.get(update.id);
        if (existingChat) {
          Object.assign(existingChat, update);
          this.emit('chatUpdate', userId, existingChat);
        }
      }
    }
  }

  // Manejar actualizaciones de presencia
  private handlePresenceUpdate(update: any, userId: string) {
    this.emit('presence', userId, update);
  }

  // Manejar actualizaciones de grupos
  private handleGroupsUpdate(updates: any[], userId: string) {
    this.emit('groups', userId, updates);
  }

  // Convertir mensaje de Baileys a formato interno
  private async convertToWhatsAppMessage(message: WAMessage, socket: WASocket): Promise<WhatsAppMessage | null> {
    try {
      const key = message.key;
      const content = message.message;
      
      if (!content) return null;

      const messageId = this.getMessageId(key);
      const chatId = key.remoteJid || '';
      const fromMe = key.fromMe || false;
      const senderId = key.participant || key.remoteJid || '';
      
      // Obtener nombre del remitente
      let senderName = 'Usuario';
      if (!fromMe && senderId) {
        try {
          // Usar el ID del remitente como nombre por defecto
          senderName = senderId.split('@')[0] || 'Usuario';
        } catch (error) {
          logger.error('Error getting contact name:', error);
        }
      }

      // Extraer contenido del mensaje
      let body = '';
      let type = 'unknown';
      let hasMedia = false;
      let media: any = undefined;

      if (content.conversation) {
        body = content.conversation;
        type = 'text';
      } else if (content.extendedTextMessage) {
        body = content.extendedTextMessage.text || '';
        type = 'extendedText';
      } else if (content.imageMessage) {
        body = content.imageMessage.caption || '';
        type = 'image';
        hasMedia = true;
        media = {
          mimetype: content.imageMessage.mimetype,
          caption: content.imageMessage.caption,
          url: content.imageMessage.url
        };
      } else if (content.videoMessage) {
        body = content.videoMessage.caption || '';
        type = 'video';
        hasMedia = true;
        media = {
          mimetype: content.videoMessage.mimetype,
          caption: content.videoMessage.caption,
          url: content.videoMessage.url
        };
      } else if (content.audioMessage) {
        type = 'audio';
        hasMedia = true;
        media = {
          mimetype: content.audioMessage.mimetype,
          url: content.audioMessage.url
        };
      } else if (content.documentMessage) {
        body = content.documentMessage.caption || '';
        type = 'document';
        hasMedia = true;
        media = {
          mimetype: content.documentMessage.mimetype,
          filename: content.documentMessage.fileName,
          caption: content.documentMessage.caption,
          url: content.documentMessage.url
        };
      } else if (content.stickerMessage) {
        type = 'sticker';
        hasMedia = true;
        media = {
          mimetype: content.stickerMessage.mimetype,
          url: content.stickerMessage.url
        };
      } else if (content.contactMessage) {
        type = 'contact';
        body = 'Contacto compartido';
      } else if (content.locationMessage) {
        type = 'location';
        body = 'Ubicación compartida';
      }

      return {
        id: messageId,
        key,
        message: content,
        messageTimestamp: Number(message.messageTimestamp || Math.floor(Date.now() / 1000)),
        status: fromMe ? 'sent' : 'delivered',
        fromMe,
        chatId,
        senderId,
        senderName,
        body,
        type,
        hasMedia,
        media,
        quotedMessage: content.extendedTextMessage?.contextInfo?.quotedMessage ? 
          await this.convertToWhatsAppMessage({
            key: (content.extendedTextMessage.contextInfo.quotedMessage as any).key,
            message: (content.extendedTextMessage.contextInfo.quotedMessage as any).message,
            messageTimestamp: message.messageTimestamp
          } as WAMessage, socket) || undefined : undefined,
        contextInfo: content.extendedTextMessage?.contextInfo
      };
    } catch (error) {
      logger.error('Error converting message:', error);
      return null;
    }
  }

  // Convertir chat de Baileys a formato interno
  private convertToWhatsAppChat(chat: Chat): WhatsAppChat {
    return {
      id: chat.id,
      name: chat.name || 'Chat sin nombre',
      isGroup: chat.id.includes('@g.us'),
      isReadOnly: Boolean(chat.readOnly),
      unreadCount: chat.unreadCount || 0,
      participants: (chat as any).participants || [],
      createdAt: Number(chat.conversationTimestamp || Date.now()),
      updatedAt: Date.now(),
      archived: Boolean(chat.archived),
      pinned: Boolean(chat.pinned),
      ephemeralExpiration: chat.ephemeralExpiration ? Number(chat.ephemeralExpiration) : undefined,
      ephemeralSettingTimestamp: chat.ephemeralSettingTimestamp ? Number(chat.ephemeralSettingTimestamp) : undefined
    };
  }

  // Obtener ID único del mensaje
  private getMessageId(key: WAMessageKey): string {
    return `${key.remoteJid}_${key.id}`;
  }

  // Guardar mensaje en cache
  private saveMessageToCache(message: WhatsAppMessage) {
    const chatId = message.chatId;
    if (!this.messageCache.has(chatId)) {
      this.messageCache.set(chatId, []);
    }
    
    const messages = this.messageCache.get(chatId)!;
    const existingIndex = messages.findIndex(msg => msg.id === message.id);
    
    if (existingIndex !== -1) {
      messages[existingIndex] = message;
    } else {
      messages.push(message);
      // Mantener solo los últimos 1000 mensajes por chat
      if (messages.length > 1000) {
        messages.splice(0, messages.length - 1000);
      }
    }
  }

  // Limpiar cache
  private cleanupCache() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas

    for (const [chatId, messages] of this.messageCache.entries()) {
      const recentMessages = messages.filter(msg => 
        (now - (msg.messageTimestamp * 1000)) < maxAge
      );
      
      if (recentMessages.length === 0) {
        this.messageCache.delete(chatId);
      } else {
        this.messageCache.set(chatId, recentMessages);
      }
    }
  }

  // Enviar mensaje
  async sendMessage(userId: string, to: string, message: string): Promise<WhatsAppMessage | null> {
    const session = this.sessions.get(userId);
    if (!session || !session.socket || !session.isConnected) {
      throw new Error('Sesión no conectada');
    }

    try {
      const formattedNumber = to.includes('@') ? to : `${to}@s.whatsapp.net`;
      
      const sentMessage = await session.socket.sendMessage(formattedNumber, { text: message });
      
      logger.info(`Message sent to ${formattedNumber} via session ${userId}`);
      
      // Convertir mensaje enviado a formato interno
      if (sentMessage) {
        const whatsappMessage = await this.convertToWhatsAppMessage(sentMessage, session.socket);
        if (whatsappMessage) {
          this.saveMessageToCache(whatsappMessage);
        }
        return whatsappMessage;
      }
      
      return null;
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
  }

  // Enviar mensaje con media
  async sendMediaMessage(userId: string, to: string, media: any, caption?: string): Promise<WhatsAppMessage | null> {
    const session = this.sessions.get(userId);
    if (!session || !session.socket || !session.isConnected) {
      throw new Error('Sesión no conectada');
    }

    try {
      const formattedNumber = to.includes('@') ? to : `${to}@s.whatsapp.net`;
      
      let messageContent: any = {};
      
      if (media.mimetype?.startsWith('image/')) {
        messageContent.image = media;
      } else if (media.mimetype?.startsWith('video/')) {
        messageContent.video = media;
      } else if (media.mimetype?.startsWith('audio/')) {
        messageContent.audio = media;
      } else {
        messageContent.document = media;
      }
      
      if (caption) {
        messageContent.caption = caption;
      }
      
      const sentMessage = await session.socket.sendMessage(formattedNumber, messageContent);
      
      logger.info(`Media message sent to ${formattedNumber} via session ${userId}`);
      
      if (sentMessage) {
        const whatsappMessage = await this.convertToWhatsAppMessage(sentMessage, session.socket);
        if (whatsappMessage) {
          this.saveMessageToCache(whatsappMessage);
        }
        return whatsappMessage;
      }
      
      return null;
    } catch (error) {
      logger.error('Error sending media message:', error);
      throw error;
    }
  }

  // Obtener chats
  async getChats(userId: string): Promise<WhatsAppChat[]> {
    const session = this.sessions.get(userId);
    if (!session || !session.socket || !session.isConnected) {
      return Array.from(this.chatCache.values());
    }

    try {
      // Usar el cache por ahora, ya que getChats no está disponible en la versión actual
      return Array.from(this.chatCache.values());
    } catch (error) {
      logger.error('Error getting chats:', error);
      return Array.from(this.chatCache.values());
    }
  }

  // Obtener mensajes de un chat
  async getMessages(userId: string, chatId: string, limit: number = 50): Promise<WhatsAppMessage[]> {
    const session = this.sessions.get(userId);
    if (!session || !session.socket || !session.isConnected) {
      return this.messageCache.get(chatId)?.slice(-limit) || [];
    }

    try {
      // Usar el cache por ahora, ya que getMessages no está disponible en la versión actual
      return this.messageCache.get(chatId)?.slice(-limit) || [];
    } catch (error) {
      logger.error('Error getting messages:', error);
      return this.messageCache.get(chatId)?.slice(-limit) || [];
    }
  }

  // Marcar mensajes como leídos
  async markAsRead(userId: string, chatId: string, messageIds?: string[]): Promise<boolean> {
    const session = this.sessions.get(userId);
    if (!session || !session.socket || !session.isConnected) {
      return false;
    }

    try {
      if (messageIds && messageIds.length > 0) {
        await session.socket.readMessages(messageIds.map(id => ({ remoteJid: chatId, id })));
      } else {
        await session.socket.readMessages([{ remoteJid: chatId, id: 'all' }]);
      }
      
      logger.info(`Messages marked as read in chat ${chatId} for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error marking messages as read:', error);
      return false;
    }
  }

  // Registrar handler de mensajes
  onMessage(userId: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(userId)) {
      this.messageHandlers.set(userId, []);
    }
    this.messageHandlers.get(userId)!.push(handler);
  }

  // Obtener estado de conexión
  getConnectionStatus(userId: string) {
    const session = this.sessions.get(userId);
    if (!session) {
      return {
        isConnected: false,
        isAuthenticated: false,
        sessionId: null
      };
    }

    return {
      isConnected: session.isConnected,
      isAuthenticated: session.isAuthenticated,
      sessionId: session.sessionId,
      phoneNumber: session.phoneNumber,
      userName: session.userName,
      lastSeen: session.lastSeen
    };
  }

  // Obtener QR code
  async getQRCode(userId: string): Promise<string | null> {
    const session = this.sessions.get(userId);
    return session?.qrCode || null;
  }

  // Desconectar sesión
  async disconnectSession(userId: string): Promise<void> {
    const session = this.sessions.get(userId);
    if (session) {
      if (session.socket && session.isConnected) {
        try {
          logger.info(`Logging out socket for user ${userId}`);
          await session.socket.logout();
        } catch (error) {
          logger.error(`Error logging out socket for user ${userId}:`, error);
        }
      }
      
      this.cleanupSession(userId);
      logger.info(`Session ${session.sessionId} disconnected`);
    }
  }

  // Limpiar sesión
  private cleanupSession(userId: string): void {
    this.sessions.delete(userId);
    this.messageHandlers.delete(userId);
    this.emit('disconnected', userId);
  }

  // Obtener estadísticas
  getStats() {
    return {
      activeSessions: this.sessions.size,
      connectedSessions: Array.from(this.sessions.values()).filter(s => s.isConnected).length,
      totalChats: this.chatCache.size,
      totalMessages: Array.from(this.messageCache.values()).reduce((sum, messages) => sum + messages.length, 0)
    };
  }
}

// Instancia singleton
logger.info('Creating WhatsAppMessageService instance...');
export const whatsappMessageService = new WhatsAppMessageService();
logger.info('WhatsAppMessageService instance created');
