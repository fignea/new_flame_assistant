import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse, SendMessageRequest } from '../types';
import { whatsappService } from '../services/WhatsAppService';
import { database } from '../config/database';
import { redisConfig } from '../config/redis';
import { logger } from '../utils/logger';
import { generateChatHashForWhatsApp, generateDeterministicHash } from '../utils/hash';

// Función auxiliar para obtener MIME type basado en el tipo de mensaje
function getMimeTypeFromMessageType(messageType: string): string {
  switch (messageType) {
    case 'audio':
      return 'audio/ogg; codecs=opus';
    case 'image':
      return 'image/jpeg';
    case 'video':
      return 'video/mp4';
    case 'document':
      return 'application/octet-stream';
    case 'sticker':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

// Función auxiliar para generar nombre de archivo basado en el tipo de mensaje
function generateFilenameFromMessageType(messageType: string, messageId: string): string {
  const timestamp = Date.now();
  switch (messageType) {
    case 'audio':
      return `audio_${timestamp}_${messageId}.ogg`;
    case 'image':
      return `image_${timestamp}_${messageId}.jpg`;
    case 'video':
      return `video_${timestamp}_${messageId}.mp4`;
    case 'document':
      return `document_${timestamp}_${messageId}`;
    case 'sticker':
      return `sticker_${timestamp}_${messageId}.webp`;
    default:
      return `file_${timestamp}_${messageId}`;
  }
}

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
      let qrData = null;
      try {
        qrData = await redisConfig.getQRCode(userId);
      } catch (error) {
        console.warn(`⚠️ Error obteniendo QR de Redis para usuario ${userId}:`, error);
        // Continuar sin Redis si falla
      }
      
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

      // Verificar que el contacto existe y pertenece al tenant
      const contact = await database.get(
        'SELECT whatsapp_id FROM contacts WHERE tenant_id = $1 AND whatsapp_id = $2',
        [req.tenant?.id, contactId]
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
        WHERE tenant_id = $1
      `;
      let countQuery = 'SELECT COUNT(*) as total FROM contacts WHERE tenant_id = $1';
      let params: any[] = [req.tenant?.id];

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

  public async createContact(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { name, phone_number, whatsapp_id, is_group = false } = req.body;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'El nombre es requerido'
        });
      }

      if (!phone_number && !whatsapp_id) {
        return res.status(400).json({
          success: false,
          message: 'Al menos uno de los identificadores (teléfono o WhatsApp ID) es requerido'
        });
      }

      // Si no se proporciona whatsapp_id, usar phone_number
      const finalWhatsappId = whatsapp_id || phone_number;
      
      // Verificar si el contacto ya existe
      const existingContact = await database.get(
        'SELECT id FROM contacts WHERE tenant_id = $1 AND whatsapp_id = $2',
        [req.tenant?.id, finalWhatsappId]
      );

      if (existingContact) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe un contacto con este identificador'
        });
      }

      // Crear el contacto
      const result = await database.run(
        `INSERT INTO contacts (tenant_id, user_id, whatsapp_id, name, phone_number, is_group, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
        [req.tenant?.id, userId, finalWhatsappId, name, phone_number || null, is_group]
      );

      // Obtener el contacto creado
      const newContactResult = await database.all(
        'SELECT id, whatsapp_id, name, phone_number, is_group, avatar_url, created_at, updated_at FROM contacts WHERE id = $1',
        [result.id]
      );
      const newContact = newContactResult[0] || null;

      return res.status(201).json({
        success: true,
        data: newContact,
        message: 'Contacto creado exitosamente'
      });

    } catch (error) {
      console.error('Create contact error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al crear el contacto',
        error: error instanceof Error ? error.message : 'Error desconocido'
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
         WHERE id = $1 AND tenant_id = $2`,
        [id, req.tenant?.id]
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

      // Verificar que el contacto existe y pertenece al tenant
      const contact = await database.get(
        'SELECT id, whatsapp_id FROM contacts WHERE tenant_id = $1 AND (id = $2 OR whatsapp_id = $3)',
        [req.tenant?.id, contactId, contactId]
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
           WHERE tenant_id = $1 AND chat_id = $2
           ORDER BY timestamp DESC 
           LIMIT $3 OFFSET $4`,
          [req.tenant?.id, contactId, limit, offset]
        ),
        database.get(
          'SELECT COUNT(*) as total FROM messages WHERE tenant_id = $1 AND chat_id = $2',
          [req.tenant?.id, contactId]
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
        database.get('SELECT COUNT(*) as count FROM contacts WHERE tenant_id = $1', [req.tenant?.id]),
        database.get('SELECT COUNT(*) as count FROM messages WHERE tenant_id = $1', [req.tenant?.id]),
        database.get('SELECT COUNT(*) as count FROM scheduled_messages WHERE tenant_id = $1 AND status = $2', [req.tenant?.id, 'pending'])
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

      // Obtener chats únicos basados en los mensajes usando chat_hash
      const chats = await database.query(
        `SELECT 
           COALESCE(c.chat_hash, m.chat_hash) as chat_hash,
           m.chat_id as whatsapp_id,
           c.name,
           c.phone_number,
           c.is_group,
           COUNT(m.id) as message_count,
           MAX(m.timestamp) as last_message_time
         FROM messages m
         LEFT JOIN contacts c ON c.whatsapp_id = m.chat_id AND c.tenant_id = m.tenant_id
         WHERE m.tenant_id = $1
         GROUP BY COALESCE(c.chat_hash, m.chat_hash), m.chat_id, c.name, c.phone_number, c.is_group
         ORDER BY last_message_time DESC NULLS LAST
         LIMIT $2 OFFSET $3`,
        [req.tenant?.id, limit, offset]
      );

      // Formatear los chats para el frontend usando chat_hash como ID
      const formattedChats = chats.rows.map((chat: any) => {
        // Si no hay chat_hash, generar uno determinístico
        const chatHash = chat.chat_hash || generateDeterministicHash(`${chat.whatsapp_id}_${userId}`, 44);
        
        return {
          id: chatHash, // Usar chat_hash como ID principal
          whatsappId: chat.whatsapp_id, // Mantener whatsapp_id para referencia
          name: chat.name || chat.phone_number || chat.whatsapp_id.split('@')[0],
          isGroup: chat.is_group,
          isReadOnly: false,
          unreadCount: 0, // TODO: Implementar conteo de mensajes no leídos
          lastMessage: undefined, // Se cargará por separado si es necesario
          participants: chat.is_group ? [] : [chat.whatsapp_id],
          createdAt: Date.now(),
          updatedAt: (() => {
            try {
              if (chat.last_message_time) {
                const date = new Date(chat.last_message_time);
                if (!isNaN(date.getTime())) {
                  return date.getTime();
                }
              }
              return Date.now();
            } catch (error) {
              console.error('Error processing updatedAt timestamp:', chat.last_message_time, error);
              return Date.now();
            }
          })(),
          archived: false,
          pinned: false
        };
      });

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

      // Determinar si chatId es un hash o un whatsapp_id
      let whatsappId = chatId;
      let chatHash = chatId;
      
      // Si el chatId no parece ser un hash (no contiene @), asumir que es un whatsapp_id
      if (chatId.includes('@')) {
        // Es un whatsapp_id, buscar el chat_hash correspondiente
        const contactResult = await database.query(
          'SELECT chat_hash FROM contacts WHERE whatsapp_id = $1 AND tenant_id = $2',
          [chatId, req.tenant?.id]
        );
        
        if (contactResult.rows.length > 0) {
          chatHash = contactResult.rows[0].chat_hash;
        } else {
          // Generar hash determinístico si no existe
          chatHash = generateDeterministicHash(`${chatId}_${userId}`, 44);
        }
        whatsappId = chatId;
      } else {
        // Es un chat_hash, buscar el whatsapp_id correspondiente
        const contactResult = await database.query(
          'SELECT whatsapp_id FROM contacts WHERE chat_hash = $1 AND tenant_id = $2',
          [chatId, req.tenant?.id]
        );
        
        if (contactResult.rows.length > 0) {
          whatsappId = contactResult.rows[0].whatsapp_id;
        } else {
          return res.status(404).json({
            success: false,
            message: 'Chat no encontrado'
          });
        }
      }

      // Obtener mensajes del chat usando chat_hash
      const messages = await database.query(
        `SELECT 
           m.id,
           m.whatsapp_message_id,
           m.content,
           m.message_type,
           m.is_from_me,
           m.timestamp,
           m.created_at,
           m.media_url,
           c.name as contact_name,
           c.whatsapp_id,
           m.chat_hash
         FROM messages m
         LEFT JOIN contacts c ON c.whatsapp_id = m.chat_id AND c.tenant_id = m.tenant_id
         WHERE m.tenant_id = $1 AND (m.chat_hash = $2 OR m.chat_id = $3)
         ORDER BY m.timestamp ASC
         LIMIT $4 OFFSET $5`,
        [req.tenant?.id, chatHash, whatsappId, limit, offset]
      );

      // Formatear los mensajes para el frontend
      const formattedMessages = messages.rows.map((msg: any) => {
        const hasMedia = msg.media_url && msg.media_url.trim() !== '';
        const isMediaType = ['audio', 'image', 'video', 'document', 'sticker'].includes(msg.message_type);
        
        return {
          id: msg.whatsapp_message_id,
          key: {
            id: msg.whatsapp_message_id,
            remoteJid: whatsappId, // Usar whatsapp_id para la comunicación con WhatsApp
            fromMe: msg.is_from_me
          },
          message: {
            conversation: msg.content
          },
          messageTimestamp: (() => {
            try {
              const date = new Date(msg.timestamp);
              if (isNaN(date.getTime())) {
                console.warn('Invalid timestamp in message:', msg.timestamp);
                return Math.floor(Date.now() / 1000);
              }
              return Math.floor(date.getTime() / 1000);
            } catch (error) {
              console.error('Error processing message timestamp:', msg.timestamp, error);
              return Math.floor(Date.now() / 1000);
            }
          })(),
          status: 'delivered', // Estado por defecto
          fromMe: msg.is_from_me,
          chatId: chatHash, // Usar chat_hash como ID del chat
          whatsappId: whatsappId, // Mantener whatsapp_id para referencia
          senderId: msg.is_from_me ? userId : whatsappId,
          senderName: msg.is_from_me ? 'Tú' : (msg.contact_name || whatsappId.split('@')[0]),
          body: msg.content,
          type: msg.message_type,
          hasMedia: hasMedia || isMediaType,
          media: hasMedia ? {
            url: msg.media_url,
            mimetype: getMimeTypeFromMessageType(msg.message_type),
            filename: generateFilenameFromMessageType(msg.message_type, msg.whatsapp_message_id)
          } : undefined,
          mediaUrl: msg.media_url
        };
      });

      return res.json({
        success: true,
        data: {
          messages: formattedMessages,
          chatId: chatHash, // Devolver chat_hash como ID del chat
          whatsappId: whatsappId, // Incluir whatsapp_id para referencia
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
        `SELECT COUNT(*) as count FROM messages WHERE tenant_id = $1`,
        [req.tenant?.id]
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

      // Verificar que el contacto pertenece al tenant
      const contact = await database.get(
        'SELECT * FROM contacts WHERE id = $1 AND tenant_id = $2',
        [id, req.tenant?.id]
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

      // Verificar que el contacto pertenece al tenant
      const contact = await database.get(
        'SELECT * FROM contacts WHERE id = $1 AND tenant_id = $2',
        [id, req.tenant?.id]
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

      // Verificar que el contacto pertenece al tenant
      const contact = await database.get(
        'SELECT * FROM contacts WHERE id = $1 AND tenant_id = $2',
        [id, req.tenant?.id]
      );

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contacto no encontrado'
        });
      }

      // Eliminar el contacto
      await database.query(
        'DELETE FROM contacts WHERE id = $1 AND tenant_id = $2',
        [id, req.tenant?.id]
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

      // Verificar que el contacto pertenece al tenant
      const contact = await database.get(
        'SELECT * FROM contacts WHERE id = $1 AND tenant_id = $2',
        [id, req.tenant?.id]
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

  // Actualizar nombre del contacto manualmente
  public async updateContactName(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { whatsappId } = req.params;
      const { name } = req.body;
      
      // Decodificar el whatsappId que viene codificado en la URL
      const decodedWhatsappId = decodeURIComponent(whatsappId);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      if (!decodedWhatsappId || !name) {
        return res.status(400).json({
          success: false,
          message: 'ID de WhatsApp y nombre son requeridos'
        });
      }

      logger.info(`🔄 Updating contact name for WhatsApp ID: ${decodedWhatsappId}, Name: ${name}, User: ${userId}`);

      // Actualizar el nombre del contacto en la base de datos
      const result = await database.query(
        'UPDATE contacts SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE whatsapp_id = $2 AND user_id = $3 RETURNING *',
        [name, decodedWhatsappId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Contacto no encontrado'
        });
      }

      return res.json({
        success: true,
        data: result.rows[0],
        message: 'Nombre del contacto actualizado exitosamente'
      });

    } catch (error) {
      logger.error('Update contact name error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar el nombre del contacto'
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

  // Servir archivos de media de WhatsApp
  public async serveMedia(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { messageId } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      if (!messageId) {
        return res.status(400).json({
          success: false,
          message: 'ID del mensaje es requerido'
        });
      }

      // Buscar el mensaje y su media_url
      const message = await database.query(
        `SELECT media_url, message_type, whatsapp_message_id 
         FROM messages 
         WHERE whatsapp_message_id = $1 AND tenant_id = $2`,
        [messageId, req.tenant?.id]
      );

      if (message.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Mensaje no encontrado'
        });
      }

      const mediaUrl = message.rows[0].media_url;
      const messageType = message.rows[0].message_type;

      if (!mediaUrl) {
        return res.status(404).json({
          success: false,
          message: 'No hay archivo de media asociado a este mensaje'
        });
      }

      // Establecer headers apropiados
      const mimeType = getMimeTypeFromMessageType(messageType);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${messageId}"`);
      
      // Si la URL es una URL externa (de WhatsApp), redirigir
      if (mediaUrl.startsWith('http')) {
        return res.redirect(mediaUrl);
      } else {
        // Si es una ruta local, servir el archivo
        return res.sendFile(mediaUrl);
      }

    } catch (error) {
      console.error('Serve media error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al servir el archivo de media',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
}

export const whatsappController = new WhatsAppController();
