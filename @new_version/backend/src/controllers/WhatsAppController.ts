import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse, SendMessageRequest } from '../types';
import { whatsappService } from '../services/WhatsAppService';
import { database } from '../config/database';
import { redisConfig } from '../config/redis';
import { logger } from '../utils/logger';

export class WhatsAppController {
  public async createSession(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      logger.info(`🔄 Creating WhatsApp session for user ${userId}`);

      const result = await whatsappService.createSession(userId);

      return res.json({
        success: true,
        data: result,
        message: 'Sesión de WhatsApp creada exitosamente'
      });

    } catch (error) {
      console.error('Create session error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al crear la sesión de WhatsApp',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  public async getQRCode(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Intentar obtener QR de Redis primero (más rápido)
      let qrData = await redisConfig.getQRCode(userId);
      
      // Si no está en Redis, obtener de base de datos
      if (!qrData) {
        const result = await database.query(
          'SELECT qr_code FROM whatsapp_sessions WHERE user_id = $1 AND qr_code IS NOT NULL ORDER BY updated_at DESC LIMIT 1',
          [userId]
        );

        if (result.rows.length === 0 || !result.rows[0].qr_code) {
          return res.status(404).json({
            success: false,
            message: 'Código QR no disponible. Crea una nueva sesión.'
          });
        }

        qrData = { qr: '', dataURL: result.rows[0].qr_code };
      }

      return res.json({
        success: true,
        data: {
          qrCode: qrData.dataURL || qrData.qr
        },
        message: 'Código QR obtenido exitosamente'
      });

    } catch (error) {
      console.error('Get QR code error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener el código QR'
      });
    }
  }

  public async getStatus(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const status = whatsappService.getConnectionStatus(userId);

      return res.json({
        success: true,
        data: status,
        message: 'Estado de WhatsApp obtenido exitosamente'
      });

    } catch (error) {
      console.error('Get status error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener el estado de WhatsApp'
      });
    }
  }

  public async sendMessage(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { contactId, content, messageType = 'text' } = req.body;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      if (!contactId || !content) {
        return res.status(400).json({
          success: false,
          message: 'ID del contacto y contenido son requeridos'
        });
      }

      // Verificar que el contacto existe y pertenece al usuario
      const contact = await database.get(
        'SELECT whatsapp_id FROM contacts WHERE user_id = $1 AND (id = $2 OR whatsapp_id = $3)',
        [userId, contactId, contactId]
      );

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contacto no encontrado'
        });
      }

      const chatId = contact.whatsapp_id;
      const message = await whatsappService.sendMessage(userId, chatId, content);

      if (!message) {
        return res.status(500).json({
          success: false,
          message: 'Error al enviar el mensaje'
        });
      }

      return res.json({
        success: true,
        data: { message },
        message: 'Mensaje enviado exitosamente'
      });

    } catch (error) {
      console.error('Send message error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al enviar el mensaje',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  public async getContacts(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search as string;
      const offset = (page - 1) * limit;

      let query = `
        SELECT id, whatsapp_id, name, phone_number, is_group, created_at, updated_at
        FROM contacts 
        WHERE user_id = $1
      `;
      let countQuery = 'SELECT COUNT(*) as total FROM contacts WHERE user_id = $1';
      let params: any[] = [userId];

      if (search) {
        query += ' AND (name LIKE $2 OR phone_number LIKE $3)';
        countQuery += ' AND (name LIKE $2 OR phone_number LIKE $3)';
        params.push(`%${search}%`, `%${search}%`);
      }

      query += ' ORDER BY updated_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(limit, offset);

      const [contacts, totalResult] = await Promise.all([
        database.query(query, params),
        database.get(countQuery, search ? [userId, `%${search}%`, `%${search}%`] : [userId])
      ]);

      const total = (totalResult as any).total;
      const pages = Math.ceil(total / limit);

      return res.json({
        success: true,
        data: contacts,
        message: 'Contactos obtenidos exitosamente',
        pagination: {
          page,
          limit,
          total,
          pages
        }
      });

    } catch (error) {
      console.error('Get contacts error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener los contactos'
      });
    }
  }

  public async getMessages(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { contactId } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      if (!contactId) {
        return res.status(400).json({
          success: false,
          message: 'ID del contacto es requerido'
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      // Verificar que el contacto existe y pertenece al usuario
      const contact = await database.get(
        'SELECT id, whatsapp_id FROM contacts WHERE user_id = $1 AND (id = $2 OR whatsapp_id = $3)',
        [userId, contactId, contactId]
      );

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contacto no encontrado'
        });
      }

      const [messages, totalResult] = await Promise.all([
        database.query(
          `SELECT id, message_id, content, message_type, is_from_me, 
                  timestamp, created_at
           FROM messages 
           WHERE user_id = $1 AND chat_id = $2
           ORDER BY timestamp DESC 
           LIMIT $3 OFFSET $4`,
          [userId, contactId, limit, offset]
        ),
        database.get(
          'SELECT COUNT(*) as total FROM messages WHERE user_id = $1 AND chat_id = $2',
          [userId, contactId]
        )
      ]);

      const total = (totalResult as any).total;
      const pages = Math.ceil(total / limit);

      return res.json({
        success: true,
        data: messages.reverse(), // Mostrar mensajes en orden cronológico
        message: 'Mensajes obtenidos exitosamente',
        pagination: {
          page,
          limit,
          total,
          pages
        }
      });

    } catch (error) {
      console.error('Get messages error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener los mensajes'
      });
    }
  }

  public async disconnect(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      await whatsappService.disconnectSession(userId);

      return res.json({
        success: true,
        message: 'Sesión de WhatsApp desconectada exitosamente'
      });

    } catch (error) {
      console.error('Disconnect error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al desconectar la sesión de WhatsApp'
      });
    }
  }

  public async getStats(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const [contactsCount, messagesCount, scheduledCount] = await Promise.all([
        database.get('SELECT COUNT(*) as count FROM contacts WHERE user_id = $1', [userId]),
        database.get('SELECT COUNT(*) as count FROM messages WHERE user_id = $1', [userId]),
        database.get('SELECT COUNT(*) as count FROM scheduled_messages WHERE user_id = $1 AND status = $2', [userId, 'pending'])
      ]);

      const whatsappStats = whatsappService.getStats();

      return res.json({
        success: true,
        data: {
          contacts: (contactsCount as any).count,
          messages: (messagesCount as any).count,
          scheduledMessages: (scheduledCount as any).count,
          whatsappService: whatsappStats
        },
        message: 'Estadísticas obtenidas exitosamente'
      });

    } catch (error) {
      console.error('Get stats error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener las estadísticas'
      });
    }
  }

  public async forceReconnect(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Forzar reconexión
      await whatsappService.forceReconnect(userId);
      
      return res.json({
        success: true,
        message: 'Reconexión forzada iniciada'
      });

    } catch (error) {
      console.error('Force reconnect error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al forzar reconexión',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  public async getChats(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      // Obtener chats únicos basados en los mensajes
      const chats = await database.query(
        `SELECT 
           m.chat_id as id,
           c.name,
           c.phone_number,
           c.is_group,
           COUNT(m.id) as message_count,
           MAX(m.timestamp) as last_message_time
         FROM messages m
         LEFT JOIN contacts c ON c.whatsapp_id = m.chat_id AND c.user_id = m.user_id
         WHERE m.user_id = $1
         GROUP BY m.chat_id, c.name, c.phone_number, c.is_group
         ORDER BY last_message_time DESC NULLS LAST
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      // Formatear los chats para el frontend
      const formattedChats = chats.rows.map((chat: any) => ({
        id: chat.id,
        name: chat.name || chat.phone_number || chat.id.split('@')[0],
        isGroup: chat.is_group,
        isReadOnly: false,
        unreadCount: 0, // TODO: Implementar conteo de mensajes no leídos
        lastMessage: undefined, // Se cargará por separado si es necesario
        participants: chat.is_group ? [] : [chat.id],
        createdAt: Date.now(),
        updatedAt: chat.last_message_time ? new Date(chat.last_message_time).getTime() : Date.now(),
        archived: false,
        pinned: false
      }));

      return res.json({
        success: true,
        data: formattedChats,
        message: 'Chats obtenidos exitosamente'
      });

    } catch (error) {
      console.error('Get chats error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener los chats',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  public async getChatMessages(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { chatId } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      if (!chatId) {
        return res.status(400).json({
          success: false,
          message: 'ID del chat es requerido'
        });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      // Obtener mensajes del chat
      const messages = await database.query(
        `SELECT 
           m.id,
           m.message_id,
           m.content,
           m.message_type,
           m.is_from_me,
           m.timestamp,
           m.created_at,
           c.name as contact_name,
           c.whatsapp_id
         FROM messages m
         LEFT JOIN contacts c ON c.whatsapp_id = m.chat_id AND c.user_id = m.user_id
         WHERE m.user_id = $1 AND m.chat_id = $2
         ORDER BY m.timestamp ASC
         LIMIT $3 OFFSET $4`,
        [userId, chatId, limit, offset]
      );

      // Formatear los mensajes para el frontend
      const formattedMessages = messages.rows.map((msg: any) => ({
        id: msg.message_id,
        key: {
          id: msg.message_id,
          remoteJid: chatId,
          fromMe: msg.is_from_me
        },
        message: {
          conversation: msg.content
        },
        messageTimestamp: new Date(msg.timestamp).getTime() / 1000,
        status: 'delivered', // Estado por defecto
        fromMe: msg.is_from_me,
        chatId: chatId,
        senderId: msg.is_from_me ? userId : chatId,
        senderName: msg.is_from_me ? 'Tú' : (msg.contact_name || chatId.split('@')[0]),
        body: msg.content,
        type: msg.message_type,
        hasMedia: false, // Por ahora sin media
        media: undefined
      }));

      return res.json({
        success: true,
        data: {
          messages: formattedMessages,
          chatId: chatId,
          total: formattedMessages.length
        },
        message: 'Mensajes obtenidos exitosamente'
      });

    } catch (error) {
      console.error('Get chat messages error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener los mensajes del chat',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
}

export const whatsappController = new WhatsAppController();
