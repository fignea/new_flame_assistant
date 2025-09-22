import { logger } from '../utils/logger';
import QRCode from 'qrcode';
import makeWASocket, { DisconnectReason, useMultiFileAuthState, WASocket } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';

// Interfaces
interface WhatsAppSession {
  sessionId: string;
  userId: string;
  qrCode?: string;
  isConnected: boolean;
  isAuthenticated: boolean;
  phoneNumber?: string;
  userName?: string;
  lastSeen?: Date;
  createdAt: Date;
}

interface ConnectionStatus {
  isConnected: boolean;
  isAuthenticated: boolean;
  sessionId: string | null;
  phoneNumber?: string;
  userName?: string;
  lastSeen?: Date;
}

// Almacenamiento en memoria
const sessions: Map<string, WhatsAppSession> = new Map();
const qrCodes: Map<string, string> = new Map();
const connectionStates: Map<string, string> = new Map();

class WhatsAppSimpleService {
  // Crear nueva sesión
  async createSession(userId: string): Promise<{ sessionId: string; qrCode?: string }> {
    const sessionId = `whatsapp_${userId}_${Date.now()}`;
    
    logger.info(`Creating WhatsApp session for user: ${userId}`);
    
    // Verificar si ya hay una sesión activa
    const existingSession = sessions.get(userId);
    if (existingSession && existingSession.isConnected) {
      logger.info(`Session ${userId} already active and connected`);
      return { 
        sessionId: existingSession.sessionId, 
        qrCode: existingSession.qrCode 
      };
    }

    try {
      // Limpiar sesión anterior si existe
      if (sessions.has(userId)) {
        const oldSession = sessions.get(userId);
        if (oldSession && oldSession.sessionId) {
          // Aquí podrías desconectar la sesión anterior si fuera necesario
          logger.info(`Cleaning up previous session for user ${userId}`);
        }
      }

      // Crear nueva sesión
      const session: WhatsAppSession = {
        sessionId,
        userId,
        isConnected: false,
        isAuthenticated: false,
        createdAt: new Date()
      };

      // Guardar en memoria
      sessions.set(userId, session);
      connectionStates.set(userId, 'connecting');

      logger.info(`Session created for user ${userId}, waiting for QR...`);

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

  // Inicializar sesión de Baileys
  private async initializeBaileysSession(userId: string, sessionId: string): Promise<void> {
    try {
      logger.info(`Initializing Baileys session for user ${userId}`);
      
      const authFolder = path.resolve(process.cwd(), `sessions/${userId}`);
      logger.info(`Auth folder path: ${authFolder}`);
      
      const { state, saveCreds } = await useMultiFileAuthState(authFolder);
      logger.info(`Auth state loaded for user ${userId}`);

      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['FlameAI', 'Chrome', '110.0.0.0'],
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        retryRequestDelayMs: 2000,
      });
      
      logger.info(`Socket created for user ${userId}`);

      sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
          logger.info(`QR code received for user ${userId}`);
          // Convertir QR a data URL
          QRCode.toDataURL(qr, {
            width: 300,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          }).then(qrDataURL => {
            qrCodes.set(userId, qrDataURL);
            const session = sessions.get(userId);
            if (session) {
              session.qrCode = qrDataURL;
            }
            logger.info(`QR code converted to data URL for user ${userId}`);
          }).catch(error => {
            logger.error(`Error converting QR to data URL for user ${userId}:`, error);
          });
        }
        
        if (connection === 'close') {
          connectionStates.set(userId, 'closed');
          const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
          
          if (shouldReconnect) {
            logger.info(`Reconnecting session for user ${userId}`);
            setTimeout(() => {
              this.initializeBaileysSession(userId, sessionId);
            }, 5000);
          } else {
            logger.info(`Session permanently closed for user ${userId}`);
            this.cleanupSession(userId);
          }
        }
        
        if (connection === 'open') {
          logger.info(`WhatsApp connected for user ${userId}`);
          const session = sessions.get(userId);
          if (session) {
            session.isConnected = true;
            session.isAuthenticated = true;
            session.phoneNumber = 'Usuario WhatsApp';
            session.userName = 'Usuario Conectado';
            session.lastSeen = new Date();
            delete session.qrCode;
          }
          connectionStates.set(userId, 'open');
          qrCodes.delete(userId);
        }
      });

      sock.ev.on('creds.update', saveCreds);

      // Guardar el socket en la sesión
      const session = sessions.get(userId);
      if (session) {
        (session as any).socket = sock;
      }

    } catch (error) {
      logger.error(`Error initializing Baileys session for user ${userId}:`, error);
    }
  }

  // Limpiar sesión
  private cleanupSession(userId: string): void {
    const session = sessions.get(userId);
    if (session) {
      if ((session as any).socket) {
        try {
          (session as any).socket.logout();
        } catch (error) {
          logger.error(`Error logging out socket for user ${userId}:`, error);
        }
      }
    }
    sessions.delete(userId);
    qrCodes.delete(userId);
    connectionStates.delete(userId);
  }

  // Obtener QR code
  async getQRCode(userId: string): Promise<string | null> {
    return qrCodes.get(userId) || null;
  }

  // Obtener estado de conexión
  getConnectionStatus(userId: string): ConnectionStatus {
    const session = sessions.get(userId);
    const state = connectionStates.get(userId);

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

  // Desconectar sesión
  async disconnectSession(userId: string): Promise<void> {
    const session = sessions.get(userId);
    if (session) {
      logger.info(`Disconnecting session ${session.sessionId}`);
      
      // Desconectar socket si existe
      if ((session as any).socket) {
        try {
          await (session as any).socket.logout();
        } catch (error) {
          logger.error(`Error logging out socket for user ${userId}:`, error);
        }
      }
      
      // Limpiar sesión
      this.cleanupSession(userId);
      logger.info(`Session ${session.sessionId} disconnected`);
    }
  }

  // Obtener sesión por usuario
  getSessionByUserId(userId: string): WhatsAppSession | null {
    return sessions.get(userId) || null;
  }

  // Verificar si la conexión está activa
  isConnectionActive(userId: string): boolean {
    const session = sessions.get(userId);
    return !!(session && session.isConnected);
  }

  // Obtener estadísticas de sesiones
  getSessionStats(): { total: number; active: number; expired: number } {
    const total = sessions.size;
    const active = Array.from(sessions.values()).filter(s => s.isConnected).length;
    const expired = total - active;

    return { total, active, expired };
  }

  // Limpiar sesiones expiradas
  cleanupExpiredSessions(): number {
    const now = new Date();
    const expiredThreshold = 24 * 60 * 60 * 1000; // 24 horas
    let cleanedCount = 0;

    for (const [userId, session] of sessions.entries()) {
      const sessionAge = now.getTime() - session.createdAt.getTime();
      
      if (sessionAge > expiredThreshold && !session.isConnected) {
        sessions.delete(userId);
        qrCodes.delete(userId);
        connectionStates.delete(userId);
        cleanedCount++;
      }
    }

    logger.info(`Cleaned up ${cleanedCount} expired sessions`);
    return cleanedCount;
  }

  // Enviar mensaje (simulado)
  async sendMessage(userId: string, to: string, message: string): Promise<any> {
    const session = sessions.get(userId);
    if (!session || !session.isConnected) {
      throw new Error('No hay sesión activa para esta conexión');
    }

    logger.info(`Sending message to ${to}: ${message}`);
    
    // Simular envío exitoso
    return {
      key: {
        id: `msg_${Date.now()}`,
        remoteJid: `${to}@s.whatsapp.net`,
        fromMe: true
      },
      message: { conversation: message },
      messageTimestamp: Math.floor(Date.now() / 1000)
    };
  }

  // Obtener chats (simulado)
  async getChats(userId: string): Promise<any[]> {
    const session = sessions.get(userId);
    if (!session || !session.isConnected) {
      return [];
    }

    // Simular lista de chats
    return [
      {
        id: 'chat_1',
        name: 'Chat de Prueba',
        lastMessage: 'Mensaje de prueba',
        timestamp: new Date(),
        unreadCount: 0
      }
    ];
  }

  // Obtener mensajes (simulado)
  async getMessages(userId: string, chatId: string): Promise<any[]> {
    const session = sessions.get(userId);
    if (!session || !session.isConnected) {
      return [];
    }

    // Simular lista de mensajes
    return [
      {
        id: 'msg_1',
        content: 'Mensaje de prueba',
        fromMe: true,
        timestamp: new Date(),
        status: 'sent'
      }
    ];
  }
}

export const whatsappSimpleService = new WhatsAppSimpleService();