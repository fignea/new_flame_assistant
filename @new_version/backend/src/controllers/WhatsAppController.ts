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
        'SELECT whatsapp_id FROM contacts WHERE user_id = $1 AND whatsapp_id = $2',
        [userId, contactId]
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
        SELECT id, whatsapp_id, name, phone_number, is_group, avatar_url, created_at, updated_at
        FROM contacts 
        WHERE user_id = $1
      `;
      let countQuery = 'SELECT COUNT(*) as total FROM contacts WHERE user_id = $1';
      let params: any[] = [userId];

      if (search) {
        query += ' AND (name ILIKE $2 OR phone_number ILIKE $3 OR whatsapp_id ILIKE $4)';
        countQuery += ' AND (name ILIKE $2 OR phone_number ILIKE $3 OR whatsapp_id ILIKE $4)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      query += ' ORDER BY updated_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(limit, offset);

      const [contacts, totalResult] = await Promise.all([
        database.query(query, params),
        database.get(countQuery, search ? [userId, `%${search}%`, `%${search}%`, `%${search}%`] : [userId])
      ]);

      const total = (totalResult as any).total;
      const pages = Math.ceil(total / limit);

      return res.json({
        success: true,
        data: {
          data: contacts.rows,
          pagination: {
            page,
            limit,
            total,
            pages
          }
        },
        message: 'Contactos obtenidos exitosamente'
      });

    } catch (error) {
      console.error('Get contacts error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener los contactos'
      });
    }
  }

  public async getContactById(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const contact = await database.get(
        `SELECT id, whatsapp_id, name, phone_number, is_group, avatar_url, created_at, updated_at
         FROM contacts 
         WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contacto no encontrado'
        });
      }

      return res.json({
        success: true,
        data: contact,
        message: 'Contacto obtenido exitosamente'
      });

    } catch (error) {
      console.error('Get contact by id error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener el contacto'
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
          `SELECT id, whatsapp_message_id, content, message_type, is_from_me, 
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
           m.whatsapp_message_id,
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
        id: msg.whatsapp_message_id,
        key: {
          id: msg.whatsapp_message_id,
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

  public async getMessageStats(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Obtener estadísticas de mensajes
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Consulta simplificada para evitar problemas de parámetros
      const totalMessages = await database.get(
        `SELECT COUNT(*) as count FROM messages WHERE user_id = $1`,
        [userId]
      );

      console.log('Message stats results:', {
        totalMessages
      });

      const stats = {
        today: 0, // Por ahora retornamos 0 para evitar errores
        total: parseInt(String(totalMessages?.count || '0')),
        activeConversations: 0 // Por ahora retornamos 0 para evitar errores
      };

      return res.json({
        success: true,
        data: stats,
        message: 'Estadísticas de mensajes obtenidas exitosamente'
      });

    } catch (error) {
      console.error('Get message stats error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener las estadísticas de mensajes'
      });
    }
  }

  // Bloquear contacto
  public async blockContact(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar que el contacto pertenece al usuario
      const contact = await database.get(
        'SELECT * FROM contacts WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contacto no encontrado'
        });
      }

      // Bloquear el contacto
      await database.query(
        'UPDATE contacts SET is_blocked = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );

      return res.json({
        success: true,
        message: 'Contacto bloqueado exitosamente'
      });

    } catch (error) {
      console.error('Block contact error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al bloquear el contacto'
      });
    }
  }

  // Desbloquear contacto
  public async unblockContact(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar que el contacto pertenece al usuario
      const contact = await database.get(
        'SELECT * FROM contacts WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contacto no encontrado'
        });
      }

      // Desbloquear el contacto
      await database.query(
        'UPDATE contacts SET is_blocked = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );

      return res.json({
        success: true,
        message: 'Contacto desbloqueado exitosamente'
      });

    } catch (error) {
      console.error('Unblock contact error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al desbloquear el contacto'
      });
    }
  }

  // Eliminar contacto
  public async deleteContact(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar que el contacto pertenece al usuario
      const contact = await database.get(
        'SELECT * FROM contacts WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contacto no encontrado'
        });
      }

      // Eliminar el contacto
      await database.query(
        'DELETE FROM contacts WHERE id = $1',
        [id]
      );

      return res.json({
        success: true,
        message: 'Contacto eliminado exitosamente'
      });

    } catch (error) {
      console.error('Delete contact error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar el contacto'
      });
    }
  }

  // Actualizar contacto
  public async updateContact(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { name, phone_number } = req.body;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar que el contacto pertenece al usuario
      const contact = await database.get(
        'SELECT * FROM contacts WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contacto no encontrado'
        });
      }

      // Actualizar el contacto
      await database.query(
        'UPDATE contacts SET name = $1, phone_number = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [name, phone_number, id]
      );

      return res.json({
        success: true,
        message: 'Contacto actualizado exitosamente'
      });

    } catch (error) {
      console.error('Update contact error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar el contacto'
      });
    }
  }

  // Obtener datos actualizados del contacto/grupo desde WhatsApp
  public async getContactData(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { whatsappId } = req.params;
      
      // Decodificar el whatsappId que viene codificado en la URL
      const decodedWhatsappId = decodeURIComponent(whatsappId);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      if (!decodedWhatsappId) {
        return res.status(400).json({
          success: false,
          message: 'ID de WhatsApp es requerido'
        });
      }

      logger.info(`🔄 Fetching contact data for WhatsApp ID: ${decodedWhatsappId}, User: ${userId}`);

      // Verificar si hay una sesión activa de WhatsApp
      const whatsappStatus = whatsappService.getConnectionStatus(userId);
      if (!whatsappStatus.isConnected) {
        logger.warn(`WhatsApp no está conectado. Intentando reconectar...`);
        try {
          await whatsappService.forceReconnect(userId);
          // Esperar un momento para que la conexión se establezca
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (reconnectError) {
          logger.error('Error al reconectar WhatsApp:', reconnectError);
          return res.status(503).json({
            success: false,
            message: 'WhatsApp no está conectado. Por favor, reconecta desde la página de integraciones.'
          });
        }
      }

      // Obtener datos actualizados desde WhatsApp
      let contactData;
      try {
        contactData = await whatsappService.getContactData(decodedWhatsappId);
      } catch (error) {
        logger.error(`Error obteniendo datos del contacto ${decodedWhatsappId}:`, error);
        return res.status(500).json({
          success: false,
          message: 'Error interno al obtener los datos del contacto/grupo'
        });
      }

      if (!contactData) {
        return res.status(404).json({
          success: false,
          message: 'No se pudo obtener los datos del contacto/grupo'
        });
      }

      // Actualizar la base de datos con los nuevos datos
      await database.query(
        'UPDATE contacts SET name = $1, avatar_url = $2, phone_number = $3, updated_at = CURRENT_TIMESTAMP WHERE whatsapp_id = $4 AND user_id = $5',
        [
          contactData.name || null,
          contactData.avatarUrl || null,
          contactData.phoneNumber || null,
          decodedWhatsappId,
          userId
        ]
      );

      return res.json({
        success: true,
        data: contactData,
        message: 'Datos del contacto/grupo obtenidos exitosamente'
      });

    } catch (error) {
      console.error('Get contact data error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener los datos del contacto/grupo'
      });
    }
  }
}

export const whatsappController = new WhatsAppController();
