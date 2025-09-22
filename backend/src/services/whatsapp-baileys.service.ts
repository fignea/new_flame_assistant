import makeWASocket, { DisconnectReason, useMultiFileAuthState, WASocket } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import QRCode from 'qrcode';

// Interfaces
export interface WhatsAppSession {
  sessionId: string;
  userId: string;
  qrCode?: string;
  isConnected: boolean;
  isAuthenticated: boolean;
  phoneNumber?: string;
  userName?: string;
  lastSeen?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WhatsAppSessionStats {
  total: number;
  active: number;
  expired: number;
}

// Mapa para gestionar múltiples sesiones por userId
const sessions: Record<string, WASocket> = {};
const qrCodes: Record<string, string> = {};
const connectionStates: Record<string, string> = {};
const connectionLocks: Record<string, boolean> = {};
const reconnectTimeouts: Record<string, NodeJS.Timeout> = {};
const retryCounters: Record<string, number> = {};

export class WhatsAppBaileysService {
  private static instance: WhatsAppBaileysService;

  public static getInstance(): WhatsAppBaileysService {
    if (!WhatsAppBaileysService.instance) {
      WhatsAppBaileysService.instance = new WhatsAppBaileysService();
    }
    return WhatsAppBaileysService.instance;
  }

  // Función para limpiar recursos de una sesión
  private cleanupSession(userId: string) {
    delete sessions[userId];
    delete qrCodes[userId];
    delete connectionStates[userId];
    delete connectionLocks[userId];
    
    if (reconnectTimeouts[userId]) {
      clearTimeout(reconnectTimeouts[userId]);
      delete reconnectTimeouts[userId];
    }
  }

  // Crear nueva sesión
  async createSession(userId: string): Promise<{ sessionId: string; qrCode?: string }> {
    const sessionId = `whatsapp_${userId}_${Date.now()}`;
    
    // Verificar si ya hay una sesión activa
    if (sessions[userId] && connectionStates[userId] === 'open') {
      logger.info(`Sesión ${userId} ya está activa y conectada`);
      return { sessionId, qrCode: qrCodes[userId] };
    }

    // Verificar si hay un bloqueo activo
    if (connectionLocks[userId]) {
      logger.info(`Sesión ${userId} está siendo iniciada por otro proceso`);
      return { sessionId, qrCode: qrCodes[userId] };
    }

    // Establecer bloqueo
    connectionLocks[userId] = true;

    try {
      // Limpiar sesión anterior si existe
      if (sessions[userId]) {
        try {
          await sessions[userId].logout();
        } catch (error) {
          logger.info(`Error cerrando sesión anterior ${userId}:`, error);
        }
        this.cleanupSession(userId);
      }

      // Generar QR inmediatamente para demostración
      const testQR = await QRCode.toDataURL(`whatsapp-web-${Date.now()}`, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      qrCodes[userId] = testQR;
      connectionStates[userId] = 'connecting';
      logger.info(`QR simulado generado para sesión ${userId}`);

      // Simular conexión después de 30 segundos
      setTimeout(() => {
        connectionStates[userId] = 'open';
        delete qrCodes[userId];
        logger.info(`Sesión ${userId} simulada como conectada`);
      }, 30000);

      // Liberar bloqueo después de un tiempo
      setTimeout(() => {
        delete connectionLocks[userId];
      }, 5000);
      
      return { sessionId, qrCode: testQR };
    } catch (error) {
      logger.error(`Error iniciando sesión ${userId}:`, error);
      this.cleanupSession(userId);
      throw error;
    }
  }


  // Obtener QR code
  async getQRCode(userId: string): Promise<string | null> {
    return qrCodes[userId] || null;
  }

  // Obtener estado de conexión
  getConnectionStatus(userId: string): { 
    isConnected: boolean; 
    isAuthenticated: boolean; 
    sessionId: string | null;
    phoneNumber?: string;
    userName?: string;
    lastSeen?: Date;
  } {
    const session = sessions[userId];
    const isConnected = !!(session && connectionStates[userId] === 'open');
    const isAuthenticated = isConnected;
    
    return {
      isConnected,
      isAuthenticated,
      sessionId: session ? `whatsapp_${userId}_${Date.now()}` : null,
      phoneNumber: isConnected ? 'Conectado' : undefined,
      userName: isConnected ? 'Usuario WhatsApp' : undefined,
      lastSeen: isConnected ? new Date() : undefined
    };
  }

  // Desconectar sesión
  async disconnectSession(userId: string): Promise<void> {
    if (sessions[userId]) {
      try {
        await sessions[userId].logout();
        logger.info(`Sesión ${userId} desconectada por el usuario.`);
      } catch (error) {
        logger.error(`Error al desconectar la sesión ${userId}:`, error);
      } finally {
        this.cleanupSession(userId);
      }
    }
  }

  // Enviar mensaje
  async sendMessage(userId: string, number: string, message: string): Promise<any> {
    const session = sessions[userId];
    
    if (!session) {
      throw new Error('No hay sesión activa para este usuario');
    }

    if (connectionStates[userId] !== 'open') {
      throw new Error('La conexión no está activa. Por favor, reconecta la sesión de WhatsApp.');
    }

    // Formatear el número de teléfono
    let formattedNumber = number.replace(/\D/g, '');
    
    // Manejar códigos de país específicos
    if (formattedNumber.startsWith('54')) {
      formattedNumber = formattedNumber;
    } else if (formattedNumber.startsWith('52')) {
      formattedNumber = formattedNumber;
    } else if (formattedNumber.startsWith('57')) {
      formattedNumber = formattedNumber;
    } else if (formattedNumber.startsWith('1')) {
      formattedNumber = formattedNumber;
    } else {
      if (formattedNumber.length >= 9 && formattedNumber.length <= 10) {
        logger.info(`Número sin código de país detectado: ${formattedNumber}. Por favor, incluye el código de país (+54 para Argentina)`);
      }
    }
    
    const jid = `${formattedNumber}@s.whatsapp.net`;

    try {
      // Verificar si el número existe en WhatsApp
      try {
        const registeredNumbers = await session.onWhatsApp(jid);
        
        if (!registeredNumbers || registeredNumbers.length === 0 || !registeredNumbers[0] || !registeredNumbers[0].exists) {
          logger.warn(`El número ${number} (${jid}) no parece estar registrado en WhatsApp, pero intentaremos enviar el mensaje de todas formas`);
        }
      } catch (validationError) {
        logger.info(`No se pudo validar el número ${number} en WhatsApp, continuando con el envío:`, validationError);
      }

      // Enviar el mensaje
      const sentMessage = await session.sendMessage(jid, { text: message });
      
      if (!sentMessage) {
        throw new Error('Error enviando mensaje');
      }
      
      logger.info(`Mensaje enviado exitosamente a ${number} (${jid}) desde usuario ${userId}`);
      
      return sentMessage;
    } catch (error) {
      logger.error(`Error enviando mensaje a ${number} (${jid}):`, error);
      throw new Error(`Error enviando mensaje: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  // Obtener chats
  async getChats(userId: string): Promise<any[]> {
    const session = sessions[userId];
    
    if (!session) {
      throw new Error('No hay sesión activa para este usuario');
    }

    if (connectionStates[userId] !== 'open') {
      throw new Error('La conexión no está activa');
    }

    try {
      // Obtener chats usando el store de Baileys
      const chats = (session as any).store?.chats || {};
      return Object.values(chats).filter((chat: any) => !chat.id.endsWith('@g.us')); // Excluir grupos
    } catch (error) {
      logger.error(`Error obteniendo chats para usuario ${userId}:`, error);
      throw error;
    }
  }

  // Obtener mensajes de un chat
  async getMessages(userId: string, chatId: string, limit: number = 50): Promise<any[]> {
    const session = sessions[userId];
    
    if (!session) {
      throw new Error('No hay sesión activa para este usuario');
    }

    if (connectionStates[userId] !== 'open') {
      throw new Error('La conexión no está activa');
    }

    try {
      // Obtener mensajes usando el store de Baileys
      const messages = (session as any).store?.messages?.[chatId] || [];
      return messages.slice(-limit);
    } catch (error) {
      logger.error(`Error obteniendo mensajes para usuario ${userId}, chat ${chatId}:`, error);
      throw error;
    }
  }

  // Obtener estadísticas de sesiones
  getSessionStats(): WhatsAppSessionStats {
    const total = Object.keys(sessions).length;
    const active = Object.values(connectionStates).filter(state => state === 'open').length;
    const expired = total - active;

    return { total, active, expired };
  }

  // Limpiar sesiones expiradas
  async cleanupExpiredSessions(): Promise<void> {
    const now = Date.now();
    const expiredThreshold = 24 * 60 * 60 * 1000; // 24 horas

    for (const [userId, session] of Object.entries(sessions)) {
      try {
        if (connectionStates[userId] !== 'open') {
          const sessionAge = now - (session as any).createdAt;
          if (sessionAge > expiredThreshold) {
            logger.info(`Limpiando sesión expirada para usuario ${userId}`);
            await this.disconnectSession(userId);
          }
        }
      } catch (error) {
        logger.error(`Error limpiando sesión para usuario ${userId}:`, error);
      }
    }
  }
}

// Exportar instancia singleton
export const whatsappBaileysService = WhatsAppBaileysService.getInstance();
