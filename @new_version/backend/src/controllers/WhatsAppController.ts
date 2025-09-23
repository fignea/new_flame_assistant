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
        'SELECT whatsapp_id FROM contacts WHERE user_id = ? AND (id = ? OR whatsapp_id = ?)',
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
        SELECT id, whatsapp_id, name, phone_number, is_group, avatar_url, created_at, updated_at
        FROM contacts 
        WHERE user_id = ?
      `;
      let countQuery = 'SELECT COUNT(*) as total FROM contacts WHERE user_id = ?';
      let params: any[] = [userId];

      if (search) {
        query += ' AND (name LIKE ? OR phone_number LIKE ?)';
        countQuery += ' AND (name LIKE ? OR phone_number LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
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
        'SELECT id, whatsapp_id FROM contacts WHERE user_id = ? AND (id = ? OR whatsapp_id = ?)',
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
                  timestamp, status, media_url, created_at
           FROM messages 
           WHERE user_id = ? AND contact_id = ?
           ORDER BY timestamp DESC 
           LIMIT ? OFFSET ?`,
          [userId, contact.id, limit, offset]
        ),
        database.get(
          'SELECT COUNT(*) as total FROM messages WHERE user_id = ? AND contact_id = ?',
          [userId, contact.id]
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
        database.get('SELECT COUNT(*) as count FROM contacts WHERE user_id = ?', [userId]),
        database.get('SELECT COUNT(*) as count FROM messages WHERE user_id = ?', [userId]),
        database.get('SELECT COUNT(*) as count FROM scheduled_messages WHERE user_id = ? AND status = "pending"', [userId])
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
}

export const whatsappController = new WhatsAppController();
