import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  proto,
  WAMessage,
  WAMessageKey,
  Chat,
  MessageUpsertType,
  ConnectionState
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import pino from 'pino';
import { WhatsAppMessage, WhatsAppContact, WhatsAppConnectionStatus } from '../types';
import { database } from '../config/database';
import { redisConfig } from '../config/redis';
import { logger, logWhatsApp } from '../utils/logger';

export class WhatsAppService extends EventEmitter {
  private sessions: Map<number, {
    socket: WASocket | null;
    isConnected: boolean;
    isAuthenticated: boolean;
    phoneNumber?: string;
    userName?: string;
    qrCode?: string;
    sessionId: string;
    userId: number;
  }> = new Map();

  private connectionMonitors: Map<number, NodeJS.Timeout> = new Map();
  private reconnectAttempts: Map<number, number> = new Map();
  private maxReconnectAttempts = 5;

  constructor() {
    super();
    logger.info('🔄 WhatsAppService initialized');
    this.setupCleanupInterval();
    this.restoreExistingSessions();
  }

  private setupCleanupInterval(): void {
    // Limpiar sesiones inactivas cada 30 minutos
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, 30 * 60 * 1000);
  }

  private async restoreExistingSessions(): Promise<void> {
    try {
      logger.info('🔄 Restoring existing WhatsApp sessions...');
      
      // Obtener sesiones existentes de la base de datos
      const result = await database.query(
        `SELECT user_id, session_id, phone_number, name, is_connected, created_at 
         FROM whatsapp_sessions 
         WHERE created_at > NOW() - INTERVAL '24 hours'
         ORDER BY created_at DESC`
      );

      for (const row of result.rows) {
        const userId = row.user_id;
        const sessionId = row.session_id;
        
        logger.info(`🔄 Restoring session for user ${userId}: ${sessionId}`);
        
        // Crear sesión en memoria
        const session = {
          socket: null,
          isConnected: false,
          isAuthenticated: false,
          sessionId,
          userId,
          phoneNumber: row.phone_number,
          userName: row.name
        };

        this.sessions.set(userId, session);

        // Intentar reconectar si estaba conectada
        if (row.is_connected) {
          logger.info(`🔄 Attempting to reconnect user ${userId}...`);
          setTimeout(() => {
            this.initializeBaileysSocket(userId).catch(error => {
              logger.error(`❌ Failed to restore session for user ${userId}:`, error);
            });
          }, 2000 + (Math.random() * 3000)); // Delay aleatorio para evitar sobrecarga
        }
      }

      logger.info(`✅ Restored ${result.rows.length} existing sessions`);
    } catch (error) {
      logger.error('❌ Error restoring existing sessions:', error);
    }
  }

  private scheduleReconnect(userId: number): void {
    const attempts = this.reconnectAttempts.get(userId) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      logger.error(`❌ Max reconnection attempts reached for user ${userId}`);
      this.reconnectAttempts.delete(userId);
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, attempts), 30000); // Backoff exponencial, máximo 30 segundos
    this.reconnectAttempts.set(userId, attempts + 1);

    logger.info(`🔄 Scheduling reconnect for user ${userId} in ${delay}ms (attempt ${attempts + 1}/${this.maxReconnectAttempts})`);

    const timeout = setTimeout(async () => {
      try {
        await this.initializeBaileysSocket(userId);
        this.reconnectAttempts.delete(userId); // Reset on successful connection
        logger.info(`✅ Successfully reconnected user ${userId}`);
      } catch (error) {
        logger.error(`❌ Reconnection failed for user ${userId}:`, error);
        // Schedule another attempt
        this.scheduleReconnect(userId);
      }
    }, delay);

    this.connectionMonitors.set(userId, timeout);
  }

  public async createSession(userId: number): Promise<{ sessionId: string; qrCode?: string }> {
    logger.info(`🔄 Creating WhatsApp session for user ${userId}`);

    // Verificar si ya existe una sesión activa
    const existingSession = this.sessions.get(userId);
    if (existingSession && existingSession.isConnected) {
      console.log(`✅ Session already exists for user ${userId}`);
      return {
        sessionId: existingSession.sessionId,
        qrCode: existingSession.qrCode
      };
    }

    // Crear nueva sesión
    const sessionId = `wa_${userId}_${Date.now()}`;
    
    // Limpiar sesión anterior si existe
    if (existingSession) {
      await this.disconnectSession(userId);
    }

    // Inicializar nueva sesión
    const session = {
      socket: null,
      isConnected: false,
      isAuthenticated: false,
      sessionId,
      userId
    };

    this.sessions.set(userId, session);

    // Crear sesión en base de datos
    try {
      await database.query(
        `INSERT INTO whatsapp_sessions (user_id, session_id, is_connected, created_at, updated_at) 
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (session_id) 
         DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
        [userId, sessionId, false]
      );
    } catch (error) {
      console.error(`❌ Error creating session in database for user ${userId}:`, error);
      this.sessions.delete(userId);
      throw error;
    }

    // Inicializar socket de Baileys
    try {
      await this.initializeBaileysSocket(userId);
    } catch (error) {
      console.error(`❌ Error initializing socket for user ${userId}:`, error);
      this.sessions.delete(userId);
      throw error;
    }

    return { sessionId };
  }

  private async initializeBaileysSocket(userId: number): Promise<void> {
    const session = this.sessions.get(userId);
    if (!session) throw new Error('Session not found');

    console.log(`🔄 Initializing Baileys socket for user ${userId}`);

    // Configurar directorio de autenticación
    const authDir = path.join(process.env.WHATSAPP_SESSION_PATH || './sessions', `user_${userId}`);
    
    // Crear directorio si no existe
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    try {
      // Configurar autenticación
      const { state, saveCreds } = await useMultiFileAuthState(authDir);

      // Crear socket
      const socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['WhatsApp Manager', 'Chrome', '1.0.0'],
        connectTimeoutMs: parseInt(process.env.WHATSAPP_CONNECT_TIMEOUT || '60000'),
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 10000,
        logger: pino({ level: 'silent' }),
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        markOnlineOnConnect: true,
        getMessage: async (key) => {
          return { conversation: 'Message not available' };
        }
      });

      session.socket = socket;

      // Configurar event handlers
      this.setupSocketEvents(socket, userId);

      // Auto-guardar credenciales
      socket.ev.on('creds.update', saveCreds);

      console.log(`✅ Socket initialized for user ${userId}`);

    } catch (error) {
      console.error(`❌ Error creating socket for user ${userId}:`, error);
      throw error;
    }
  }

  private setupSocketEvents(socket: WASocket, userId: number): void {
    const session = this.sessions.get(userId);
    if (!session) return;

    // Eventos de conexión
    socket.ev.on('connection.update', async (update) => {
      await this.handleConnectionUpdate(update, userId);
    });

    // Eventos de mensajes
    socket.ev.on('messages.upsert', async ({ messages, type }) => {
      await this.handleMessagesUpsert(messages, type, userId);
    });

    // Eventos de chats
    socket.ev.on('chats.upsert', async (chats) => {
      await this.handleChatsUpsert(chats, userId);
    });

    // Iniciar monitoreo de conexión
    this.startConnectionMonitor(userId);
  }

  private async handleConnectionUpdate(update: Partial<ConnectionState>, userId: number): Promise<void> {
    const { connection, lastDisconnect, qr } = update;
    const session = this.sessions.get(userId);
    
    if (!session) return;

    console.log(`🔄 Connection update for user ${userId}: ${connection}, QR: ${!!qr}`);

    try {
      // Manejar QR Code
      if (qr) {
        console.log(`🔍 QR received for user ${userId}`);
        session.qrCode = qr;
        
        // Generar QR como Data URL
        const qrDataURL = await QRCode.toDataURL(qr, {
          width: 300,
          margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' }
        });

        // Guardar en base de datos
        await database.query(
          `UPDATE whatsapp_sessions SET qr_code = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE user_id = $2`,
          [qrDataURL, userId]
        );

        // Guardar en Redis para acceso rápido
        await redisConfig.setQRCode(userId, { qr, dataURL: qrDataURL });

        this.emit('qr', userId, qrDataURL);
      }

      // Manejar conexión exitosa
      if (connection === 'open') {
        console.log(`✅ WhatsApp connected for user ${userId}`);
        
        session.isConnected = true;
        session.isAuthenticated = true;
        session.qrCode = undefined;

        // Obtener información del usuario
        if (session.socket?.user) {
          session.phoneNumber = session.socket.user.id.split('@')[0];
          session.userName = session.socket.user.name || 'Unknown User';
        }

        // Actualizar base de datos
        await database.query(
          `INSERT INTO whatsapp_sessions (user_id, session_id, phone_number, name, is_connected, qr_code, updated_at) 
           VALUES ($1, $2, $3, $4, $5, NULL, CURRENT_TIMESTAMP)
           ON CONFLICT (session_id) 
           DO UPDATE SET 
             phone_number = EXCLUDED.phone_number,
             name = EXCLUDED.name,
             is_connected = EXCLUDED.is_connected,
             updated_at = CURRENT_TIMESTAMP`,
          [userId, session.sessionId, session.phoneNumber || null, session.userName || null, true]
        );

        // Limpiar QR de Redis
        await redisConfig.deleteQRCode(userId);

        this.emit('connected', userId, {
          isConnected: true,
          isAuthenticated: true,
          sessionId: session.sessionId,
          phoneNumber: session.phoneNumber,
          userName: session.userName
        });
      }

      // Manejar desconexión
      if (connection === 'close') {
        console.log(`❌ Connection closed for user ${userId}`);
        
        session.isConnected = false;
        session.isAuthenticated = false;

        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

        if (shouldReconnect) {
          this.scheduleReconnect(userId);
        } else {
          console.log(`🚫 Session logged out for user ${userId}`);
          await this.cleanupSession(userId);
          this.emit('disconnected', userId);
        }

        // Actualizar base de datos - mantener la sesión pero marcar como desconectada
        await database.query(
          `UPDATE whatsapp_sessions SET is_connected = false, updated_at = CURRENT_TIMESTAMP 
           WHERE user_id = $1`,
          [userId]
        );
      }

      // Estados intermedios
      if (connection === 'connecting') {
        console.log(`🔄 Connecting WhatsApp for user ${userId}`);
      }

    } catch (error) {
      console.error(`❌ Error handling connection update for user ${userId}:`, error);
    }
  }

  private async handleMessagesUpsert(messages: WAMessage[], type: MessageUpsertType, userId: number): Promise<void> {
    for (const message of messages) {
      try {
        const whatsappMessage = this.convertBaileysMessage(message);
        if (whatsappMessage) {
          // Log del mensaje recibido
          console.log(`💬 New message for user ${userId}:`);
          console.log(`   📱 From: ${whatsappMessage.senderName} (${whatsappMessage.senderId})`);
          console.log(`   💬 Content: ${whatsappMessage.content}`);
          console.log(`   📅 Timestamp: ${new Date(whatsappMessage.timestamp * 1000).toLocaleString()}`);
          console.log(`   🔄 Type: ${whatsappMessage.messageType}`);
          console.log(`   📤 From Me: ${whatsappMessage.isFromMe ? 'Yes' : 'No'}`);
          
          // Guardar mensaje en base de datos
          await this.saveMessage(whatsappMessage, userId);
          
          // Emitir evento
          this.emit('message', userId, whatsappMessage);
        }
      } catch (error) {
        console.error(`❌ Error processing message for user ${userId}:`, error);
      }
    }
  }

  private async handleChatsUpsert(chats: Chat[], userId: number): Promise<void> {
    for (const chat of chats) {
      try {
        const contact = this.convertBaileysChat(chat);
        if (contact) {
          // Guardar/actualizar contacto
          await this.saveContact(contact, userId);
          
          // Emitir evento
          this.emit('contact', userId, contact);
        }
      } catch (error) {
        console.error(`❌ Error processing chat for user ${userId}:`, error);
      }
    }
  }

  private convertBaileysMessage(message: WAMessage): WhatsAppMessage | null {
    try {
      const key = message.key;
      const content = message.message;
      
      if (!content || !key.remoteJid) return null;

      // Filtrar mensajes de grupo - solo procesar mensajes individuales
      if (key.remoteJid.includes('@g.us')) {
        console.log(`🚫 Skipping group message from ${key.remoteJid}`);
        return null;
      }

      let messageContent = '';
      let messageType: WhatsAppMessage['messageType'] = 'text';
      let mediaUrl: string | undefined;

      // Extraer contenido según el tipo
      if (content.conversation) {
        messageContent = content.conversation;
        messageType = 'text';
      } else if (content.extendedTextMessage) {
        messageContent = content.extendedTextMessage.text || '';
        messageType = 'text';
      } else if (content.imageMessage) {
        messageContent = content.imageMessage.caption || '[Image]';
        messageType = 'image';
        mediaUrl = content.imageMessage.url || undefined;
      } else if (content.videoMessage) {
        messageContent = content.videoMessage.caption || '[Video]';
        messageType = 'video';
        mediaUrl = content.videoMessage.url || undefined;
      } else if (content.audioMessage) {
        messageContent = '[Audio]';
        messageType = 'audio';
        mediaUrl = content.audioMessage.url || undefined;
      } else if (content.documentMessage) {
        messageContent = content.documentMessage.fileName || '[Document]';
        messageType = 'document';
        mediaUrl = content.documentMessage.url || undefined;
      } else if (content.stickerMessage) {
        messageContent = '[Sticker]';
        messageType = 'sticker';
        mediaUrl = content.stickerMessage.url || undefined;
      } else if (content.contactMessage) {
        messageContent = `[Contact] ${content.contactMessage.displayName || 'Unknown'}`;
        messageType = 'contact';
      } else if (content.locationMessage) {
        messageContent = `[Location] ${content.locationMessage.degreesLatitude}, ${content.locationMessage.degreesLongitude}`;
        messageType = 'location';
      } else if (content.liveLocationMessage) {
        messageContent = `[Live Location] ${content.liveLocationMessage.degreesLatitude}, ${content.liveLocationMessage.degreesLongitude}`;
        messageType = 'location';
      } else if (content.groupInviteMessage) {
        messageContent = `[Group Invite] ${content.groupInviteMessage.groupName || 'Unknown Group'}`;
        messageType = 'group_invite';
      } else if (content.pollCreationMessage) {
        messageContent = `[Poll] ${content.pollCreationMessage.name || 'Poll'}`;
        messageType = 'poll';
      } else if (content.pollUpdateMessage) {
        messageContent = '[Poll Update]';
        messageType = 'poll_update';
      } else if (content.reactionMessage) {
        // Filtrar reacciones - no procesar
        console.log(`🚫 Skipping reaction message`);
        return null;
      } else if (content.senderKeyDistributionMessage) {
        // Filtrar actualizaciones de seguridad - no procesar
        console.log(`🚫 Skipping security update message`);
        return null;
      } else if (content.protocolMessage) {
        // Filtrar actualizaciones de protocolo - no procesar
        console.log(`🚫 Skipping protocol update message`);
        return null;
      } else if (content.listMessage) {
        messageContent = `[List] ${content.listMessage.description || 'List Message'}`;
        messageType = 'list';
      } else if (content.listResponseMessage) {
        messageContent = `[List Response] ${content.listResponseMessage.singleSelectReply?.selectedRowId || 'Selected'}`;
        messageType = 'list_response';
      } else if (content.buttonsMessage) {
        messageContent = `[Buttons] ${content.buttonsMessage.contentText || 'Interactive Message'}`;
        messageType = 'buttons';
      } else if (content.buttonsResponseMessage) {
        messageContent = `[Button Response] ${content.buttonsResponseMessage.selectedButtonId || 'Selected'}`;
        messageType = 'button_response';
      } else if (content.templateMessage) {
        messageContent = `[Template] ${content.templateMessage.hydratedTemplate?.hydratedContentText || 'Template Message'}`;
        messageType = 'template';
      } else if (content.orderMessage) {
        messageContent = '[Order Message]';
        messageType = 'order';
      } else if (content.productMessage) {
        messageContent = `[Product] ${content.productMessage.product?.title || 'Product'}`;
        messageType = 'product';
      } else if (content.callLogMesssage) {
        // Filtrar logs de llamadas - no procesar
        console.log(`🚫 Skipping call log message`);
        return null;
      } else if (content.viewOnceMessage) {
        // Mensajes que se ven una sola vez
        if (content.viewOnceMessage.message?.imageMessage) {
          messageContent = '[View Once Image]';
          messageType = 'view_once_image';
        } else if (content.viewOnceMessage.message?.videoMessage) {
          messageContent = '[View Once Video]';
          messageType = 'view_once_video';
        } else {
          messageContent = '[View Once Message]';
          messageType = 'view_once';
        }
      } else if (content.ephemeralMessage) {
        // Filtrar mensajes efímeros - no procesar
        console.log(`🚫 Skipping ephemeral message`);
        return null;
      } else {
        // Log del tipo de mensaje desconocido para debugging
        const unknownType = Object.keys(content)[0];
        console.log(`🔍 Unknown message type: ${unknownType}`);
        messageContent = `[Unknown: ${unknownType}]`;
        messageType = 'unknown';
      }

      // Determinar el nombre del remitente
      let senderName = 'Unknown';
      if (key.fromMe) {
        senderName = 'Tú';
      } else if (key.participant) {
        // Mensaje de grupo
        senderName = key.participant.split('@')[0];
      } else if (key.remoteJid) {
        // Mensaje individual
        senderName = key.remoteJid.split('@')[0];
      }

      return {
        id: key.id || '',
        chatId: key.remoteJid,
        senderId: key.participant || key.remoteJid,
        senderName: senderName,
        content: messageContent,
        messageType,
        timestamp: Number(message.messageTimestamp || Date.now() / 1000),
        isFromMe: Boolean(key.fromMe),
        status: 'delivered',
        mediaUrl
      };
    } catch (error) {
      console.error('Error converting Baileys message:', error);
      return null;
    }
  }

  private convertBaileysChat(chat: Chat): WhatsAppContact | null {
    try {
      // Filtrar grupos - solo procesar contactos individuales
      if (chat.id.includes('@g.us')) {
        console.log(`🚫 Skipping group chat: ${chat.id}`);
        return null;
      }

      // Filtrar contactos de estado y broadcast
      if (chat.id.includes('@broadcast') || chat.id.includes('status')) {
        console.log(`🚫 Skipping status/broadcast chat: ${chat.id}`);
        return null;
      }

      return {
        id: chat.id,
        name: chat.name || chat.id.split('@')[0],
        phoneNumber: chat.id.includes('@s.whatsapp.net') ? chat.id.split('@')[0] : undefined,
        isGroup: false, // Siempre false ya que filtramos grupos
        unreadCount: chat.unreadCount || 0,
        lastSeen: new Date()
      };
    } catch (error) {
      console.error('Error converting Baileys chat:', error);
      return null;
    }
  }

  private async saveMessage(message: WhatsAppMessage, userId: number): Promise<void> {
    try {
      // Buscar o crear contacto
      let contact = await database.get(
        `SELECT id FROM contacts WHERE user_id = $1 AND whatsapp_id = $2`,
        [userId, message.chatId]
      );

      if (!contact) {
        const result = await database.run(
          `INSERT INTO contacts (user_id, whatsapp_id, name, phone_number, is_group) 
           VALUES ($1, $2, $3, $4, $5)`,
          [
            userId,
            message.chatId,
            message.senderName || message.chatId.split('@')[0],
            message.chatId.includes('@s.whatsapp.net') ? message.chatId.split('@')[0] : null,
            message.chatId.includes('@g.us')
          ]
        );
        contact = { id: result.id };
      }

      // Guardar mensaje
      await database.run(
        `INSERT INTO messages 
         (user_id, whatsapp_message_id, chat_id, content, message_type, 
          is_from_me, timestamp) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          message.id,
          message.chatId,
          message.content,
          message.messageType,
          message.isFromMe,
          new Date(message.timestamp * 1000).toISOString()
        ]
      );
    } catch (error) {
      console.error('Error saving message:', error);
    }
  }

  private async saveContact(contact: WhatsAppContact, userId: number): Promise<void> {
    try {
      await database.run(
        `INSERT INTO contacts 
         (user_id, whatsapp_id, name, phone_number, is_group, avatar_url, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, whatsapp_id) 
         DO UPDATE SET 
           name = EXCLUDED.name,
           phone_number = EXCLUDED.phone_number,
           is_group = EXCLUDED.is_group,
           avatar_url = EXCLUDED.avatar_url,
           updated_at = CURRENT_TIMESTAMP`,
        [
          userId,
          contact.id,
          contact.name,
          contact.phoneNumber,
          contact.isGroup,
          contact.avatarUrl
        ]
      );
    } catch (error) {
      console.error('Error saving contact:', error);
    }
  }

  private startConnectionMonitor(userId: number): void {
    // Limpiar monitor anterior si existe
    const existingMonitor = this.connectionMonitors.get(userId);
    if (existingMonitor) {
      clearInterval(existingMonitor);
    }

    // Crear nuevo monitor
    const monitor = setInterval(() => {
      const session = this.sessions.get(userId);
      if (!session || !session.socket) {
        clearInterval(monitor);
        this.connectionMonitors.delete(userId);
        return;
      }

      // Verificar si el socket tiene usuario (indica conexión)
      if (session.socket.user && !session.isConnected) {
        console.log(`🔍 Connection detected for user ${userId} via monitor`);
        session.isConnected = true;
        session.isAuthenticated = true;
        session.phoneNumber = session.socket.user.id.split('@')[0];
        session.userName = session.socket.user.name || 'Unknown User';

        this.emit('connected', userId, {
          isConnected: true,
          isAuthenticated: true,
          sessionId: session.sessionId,
          phoneNumber: session.phoneNumber,
          userName: session.userName
        });

        // Actualizar base de datos
        database.run(
          `UPDATE whatsapp_sessions SET is_connected = true, phone_number = $1, name = $2, 
           updated_at = CURRENT_TIMESTAMP WHERE user_id = $3`,
          [session.phoneNumber, session.userName, userId]
        ).catch(console.error);
      }
    }, 3000); // Verificar cada 3 segundos

    this.connectionMonitors.set(userId, monitor);

    // Auto-limpiar después de 5 minutos
    setTimeout(() => {
      clearInterval(monitor);
      this.connectionMonitors.delete(userId);
    }, 5 * 60 * 1000);
  }

  // Métodos públicos
  public async sendMessage(userId: number, chatId: string, content: string): Promise<WhatsAppMessage | null> {
    const session = this.sessions.get(userId);
    
    if (!session || !session.socket || !session.isConnected) {
      throw new Error('WhatsApp session not connected');
    }

    try {
      const sentMessage = await session.socket.sendMessage(chatId, { text: content });
      
      if (sentMessage) {
        const whatsappMessage = this.convertBaileysMessage(sentMessage);
        if (whatsappMessage) {
          await this.saveMessage(whatsappMessage, userId);
          return whatsappMessage;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Error sending message for user ${userId}:`, error);
      throw error;
    }
  }

  public getConnectionStatus(userId: number): WhatsAppConnectionStatus {
    const session = this.sessions.get(userId);
    
    if (!session) {
      return {
        isConnected: false,
        isAuthenticated: false
      };
    }

    return {
      isConnected: session.isConnected,
      isAuthenticated: session.isAuthenticated,
      sessionId: session.sessionId,
      phoneNumber: session.phoneNumber,
      userName: session.userName,
      qrCode: session.qrCode
    };
  }

  public async disconnectSession(userId: number): Promise<void> {
    const session = this.sessions.get(userId);
    
    if (session) {
      if (session.socket) {
        try {
          await session.socket.logout();
        } catch (error) {
          console.error(`Error logging out user ${userId}:`, error);
        }
      }
      
      await this.cleanupSession(userId);
    }
  }

  private async cleanupSession(userId: number): Promise<void> {
    // Limpiar monitor de conexión
    const monitor = this.connectionMonitors.get(userId);
    if (monitor) {
      clearInterval(monitor);
      this.connectionMonitors.delete(userId);
    }

    // Limpiar sesión
    this.sessions.delete(userId);

    // Actualizar base de datos
    await database.run(
      `UPDATE whatsapp_sessions SET is_connected = false, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $1`,
      [userId]
    );

    console.log(`🧹 Session cleaned up for user ${userId}`);
  }

  private cleanupInactiveSessions(): void {
    const now = Date.now();
    const maxInactiveTime = 30 * 60 * 1000; // 30 minutos

    for (const [userId, session] of this.sessions.entries()) {
      if (!session.isConnected) {
        // Limpiar sesiones inactivas
        this.cleanupSession(userId).catch(console.error);
      }
    }
  }

  public getStats() {
    return {
      totalSessions: this.sessions.size,
      connectedSessions: Array.from(this.sessions.values()).filter(s => s.isConnected).length,
      activeMonitors: this.connectionMonitors.size
    };
  }

  public async forceReconnect(userId: number): Promise<void> {
    logger.info(`🔄 Force reconnecting user ${userId}`);
    
    // Limpiar intentos de reconexión anteriores
    this.reconnectAttempts.delete(userId);
    
    // Cancelar monitor de conexión existente
    const existingMonitor = this.connectionMonitors.get(userId);
    if (existingMonitor) {
      clearTimeout(existingMonitor);
      this.connectionMonitors.delete(userId);
    }

    // Forzar nueva conexión
    try {
      await this.initializeBaileysSocket(userId);
      logger.info(`✅ Force reconnection successful for user ${userId}`);
    } catch (error) {
      logger.error(`❌ Force reconnection failed for user ${userId}:`, error);
      // Programar reconexión automática
      this.scheduleReconnect(userId);
      throw error;
    }
  }
}

export const whatsappService = new WhatsAppService();
