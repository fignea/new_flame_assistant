import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse, ScheduleMessageRequest } from '../types';
import { database } from '../config/database';

export class ScheduledMessagesController {
  public async create(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { conversationId, contactId, content, messageType = 'text', scheduledTime } = req.body;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      if (!content || !scheduledTime) {
        return res.status(400).json({
          success: false,
          message: 'Contenido y fecha programada son requeridos'
        });
      }

      if (!conversationId && !contactId) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere conversationId o contactId'
        });
      }

      let finalConversationId = conversationId;

      // Si se proporciona contactId en lugar de conversationId, buscar o crear conversación
      if (!conversationId && contactId) {
        // Buscar conversación existente para este contacto
        let conversation = await database.get(
          `SELECT id FROM conversations 
           WHERE tenant_id = $1 AND contact_id = $2 AND platform = 'whatsapp' 
           ORDER BY last_message_at DESC LIMIT 1`,
          [req.tenant?.id, contactId]
        );

        // Si no existe conversación, crear una
        if (!conversation) {
          const external_conv_id = `scheduled_${contactId}_${Date.now()}`;
          conversation = await database.get(
            `INSERT INTO conversations 
             (tenant_id, contact_id, platform, external_conversation_id, status, title, last_message_at) 
             VALUES ($1, $2, 'whatsapp', $3, 'active', 'Mensaje Programado', NOW())
             RETURNING id`,
            [req.tenant?.id, contactId, external_conv_id]
          );
        }

        finalConversationId = conversation.id;
      } else {
        // Verificar que la conversación existe y pertenece al tenant
        const conversation = await database.get(
          'SELECT id FROM conversations WHERE tenant_id = $1 AND id = $2',
          [req.tenant?.id, conversationId]
        );

        if (!conversation) {
          return res.status(404).json({
            success: false,
            message: 'Conversación no encontrada'
          });
        }
      }

      // Verificar que la fecha programada es futura
      const scheduledDate = new Date(scheduledTime);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'La fecha programada debe ser futura'
        });
      }

      // Crear programación
      const result = await database.get(
        `INSERT INTO scheduled_messages 
         (tenant_id, conversation_id, content, message_type, scheduled_at, created_by) 
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [req.tenant?.id, finalConversationId, content, messageType, scheduledTime, userId]
      );

      // Obtener el mensaje creado
      const scheduledMessage = await database.get(
        `SELECT sm.*, co.name as contact_name, co.phone as phone_number
         FROM scheduled_messages sm
         JOIN conversations conv ON sm.conversation_id = conv.id
         JOIN contacts co ON conv.contact_id = co.id
         WHERE sm.id = $1`,
        [result?.id]
      );

      return res.status(201).json({
        success: true,
        data: { scheduledMessage },
        message: 'Programación creado exitosamente'
      });

    } catch (error) {
      console.error('Create scheduled message error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al crear el programación'
      });
    }
  }

  public async getAll(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const offset = (page - 1) * limit;

      let query = `
        SELECT sm.*, co.name as contact_name, co.phone as phone_number
        FROM scheduled_messages sm
        JOIN conversations conv ON sm.conversation_id = conv.id
        JOIN contacts co ON conv.contact_id = co.id
        WHERE sm.tenant_id = $1
      `;
      let countQuery = 'SELECT COUNT(*)::integer as count FROM scheduled_messages WHERE tenant_id = $1';
      let params: any[] = [req.tenant?.id];

      if (status) {
        query += ` AND sm.status = $2`;
        countQuery += ` AND status = $2`;
        params.push(status);
      }

      query += ` ORDER BY sm.scheduled_at ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const [messages, totalResult] = await Promise.all([
        database.query(query, params),
        database.get(countQuery, status ? [req.tenant?.id, status] : [req.tenant?.id])
      ]);

      const total = parseInt((totalResult as any).count) || 0;
      const pages = Math.ceil(total / limit);

      return res.json({
        success: true,
        data: messages.rows,
        message: 'Programación obtenidos exitosamente',
        pagination: {
          page,
          limit,
          total,
          pages
        }
      });

    } catch (error) {
      console.error('Get scheduled messages error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener los programación'
      });
    }
  }

  public async getById(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const scheduledMessage = await database.get(
        `SELECT sm.*, c.name as contact_name, c.whatsapp_id, c.phone_number
         FROM scheduled_messages sm
         JOIN contacts c ON sm.contact_id = c.id
         WHERE sm.id = $1 AND sm.tenant_id = $2`,
        [id, req.tenant?.id]
      );

      if (!scheduledMessage) {
        return res.status(404).json({
          success: false,
          message: 'Programación no encontrado'
        });
      }

      return res.json({
        success: true,
        data: { scheduledMessage },
        message: 'Programación obtenido exitosamente'
      });

    } catch (error) {
      console.error('Get scheduled message error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener el programación'
      });
    }
  }

  public async update(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { content, messageType, scheduledTime } = req.body;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar que el mensaje existe y pertenece al tenant
      const existingMessage = await database.get(
        'SELECT * FROM scheduled_messages WHERE id = $1 AND tenant_id = $2',
        [id, req.tenant?.id]
      );

      if (!existingMessage) {
        return res.status(404).json({
          success: false,
          message: 'Programación no encontrado'
        });
      }

      // No permitir editar mensajes ya enviados
      if (existingMessage.status === 'sent') {
        return res.status(400).json({
          success: false,
          message: 'No se puede editar un mensaje ya enviado'
        });
      }

      // Verificar que la fecha programada es futura (si se proporciona)
      if (scheduledTime) {
        const scheduledDate = new Date(scheduledTime);
        if (scheduledDate <= new Date()) {
          return res.status(400).json({
            success: false,
            message: 'La fecha programada debe ser futura'
          });
        }
      }

      // Actualizar mensaje
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (content) {
        updates.push(`content = $${paramIndex}`);
        params.push(content);
        paramIndex++;
      }
      if (messageType) {
        updates.push(`message_type = $${paramIndex}`);
        params.push(messageType);
        paramIndex++;
      }
      if (scheduledTime) {
        updates.push(`scheduled_at = $${paramIndex}`);
        params.push(scheduledTime);
        paramIndex++;
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay campos para actualizar'
        });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);
      params.push(req.tenant?.id);

      await database.run(
        `UPDATE scheduled_messages SET ${updates.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}`,
        params
      );

      // Obtener el mensaje actualizado
      const updatedMessage = await database.get(
        `SELECT sm.*, co.name as contact_name, co.phone as phone_number
         FROM scheduled_messages sm
         JOIN conversations conv ON sm.conversation_id = conv.id
         JOIN contacts co ON conv.contact_id = co.id
         WHERE sm.id = $1`,
        [id]
      );

      return res.json({
        success: true,
        data: { scheduledMessage: updatedMessage },
        message: 'Programación actualizado exitosamente'
      });

    } catch (error) {
      console.error('Update scheduled message error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar el programación'
      });
    }
  }

  public async delete(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar que el mensaje existe y pertenece al tenant
      const existingMessage = await database.get(
        'SELECT status FROM scheduled_messages WHERE id = $1 AND tenant_id = $2',
        [id, req.tenant?.id]
      );

      if (!existingMessage) {
        return res.status(404).json({
          success: false,
          message: 'Programación no encontrado'
        });
      }

      // No permitir eliminar mensajes ya enviados
      if (existingMessage.status === 'sent') {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar un mensaje ya enviado'
        });
      }

      // Eliminar mensaje
      await database.run(
        'DELETE FROM scheduled_messages WHERE id = $1 AND tenant_id = $2',
        [id, req.tenant?.id]
      );

      return res.json({
        success: true,
        message: 'Programación eliminado exitosamente'
      });

    } catch (error) {
      console.error('Delete scheduled message error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar el programación'
      });
    }
  }

  public async cancel(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar que el mensaje existe y pertenece al tenant
      const existingMessage = await database.get(
        'SELECT status FROM scheduled_messages WHERE id = $1 AND tenant_id = $2',
        [id, req.tenant?.id]
      );

      if (!existingMessage) {
        return res.status(404).json({
          success: false,
          message: 'Programación no encontrado'
        });
      }

      // No permitir cancelar mensajes ya enviados
      if (existingMessage.status === 'sent') {
        return res.status(400).json({
          success: false,
          message: 'No se puede cancelar un mensaje ya enviado'
        });
      }

      // Cancelar mensaje
      await database.run(
        'UPDATE scheduled_messages SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND tenant_id = $3',
        ['cancelled', id, req.tenant?.id]
      );

      return res.json({
        success: true,
        message: 'Programación cancelado exitosamente'
      });

    } catch (error) {
      console.error('Cancel scheduled message error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al cancelar el programación'
      });
    }
  }
}

export const scheduledMessagesController = new ScheduledMessagesController();
