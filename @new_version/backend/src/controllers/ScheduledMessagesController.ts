import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse, ScheduleMessageRequest } from '../types';
import { database } from '../config/database';

export class ScheduledMessagesController {
  public async create(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { contactId, content, messageType = 'text', scheduledTime } = req.body;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      if (!contactId || !content || !scheduledTime) {
        return res.status(400).json({
          success: false,
          message: 'ID del contacto, contenido y fecha programada son requeridos'
        });
      }

      // Verificar que el contacto existe y pertenece al usuario
      const contact = await database.get(
        'SELECT id FROM contacts WHERE user_id = ? AND id = ?',
        [userId, contactId]
      );

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contacto no encontrado'
        });
      }

      // Verificar que la fecha programada es futura
      const scheduledDate = new Date(scheduledTime);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'La fecha programada debe ser futura'
        });
      }

      // Crear mensaje programado
      const result = await database.run(
        `INSERT INTO scheduled_messages 
         (user_id, contact_id, content, message_type, scheduled_time) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, contactId, content, messageType, scheduledTime]
      );

      // Obtener el mensaje creado
      const scheduledMessage = await database.get(
        `SELECT sm.*, c.name as contact_name, c.whatsapp_id 
         FROM scheduled_messages sm
         JOIN contacts c ON sm.contact_id = c.id
         WHERE sm.id = ?`,
        [result.id]
      );

      return res.status(201).json({
        success: true,
        data: { scheduledMessage },
        message: 'Mensaje programado creado exitosamente'
      });

    } catch (error) {
      console.error('Create scheduled message error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al crear el mensaje programado'
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
        SELECT sm.*, c.name as contact_name, c.whatsapp_id, c.phone_number
        FROM scheduled_messages sm
        JOIN contacts c ON sm.contact_id = c.id
        WHERE sm.user_id = $1
      `;
      let countQuery = 'SELECT COUNT(*) as total FROM scheduled_messages WHERE user_id = $1';
      let params: any[] = [userId];

      if (status) {
        query += ` AND sm.status = $2`;
        countQuery += ` AND status = $2`;
        params.push(status);
      }

      query += ` ORDER BY sm.scheduled_time ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const [messages, totalResult] = await Promise.all([
        database.query(query, params),
        database.get(countQuery, status ? [userId, status] : [userId])
      ]);

      const total = (totalResult as any).total;
      const pages = Math.ceil(total / limit);

      return res.json({
        success: true,
        data: messages,
        message: 'Mensajes programados obtenidos exitosamente',
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
        message: 'Error al obtener los mensajes programados'
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
         WHERE sm.id = ? AND sm.user_id = ?`,
        [id, userId]
      );

      if (!scheduledMessage) {
        return res.status(404).json({
          success: false,
          message: 'Mensaje programado no encontrado'
        });
      }

      return res.json({
        success: true,
        data: { scheduledMessage },
        message: 'Mensaje programado obtenido exitosamente'
      });

    } catch (error) {
      console.error('Get scheduled message error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener el mensaje programado'
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

      // Verificar que el mensaje existe y pertenece al usuario
      const existingMessage = await database.get(
        'SELECT * FROM scheduled_messages WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (!existingMessage) {
        return res.status(404).json({
          success: false,
          message: 'Mensaje programado no encontrado'
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

      if (content) {
        updates.push('content = ?');
        params.push(content);
      }
      if (messageType) {
        updates.push('message_type = ?');
        params.push(messageType);
      }
      if (scheduledTime) {
        updates.push('scheduled_time = ?');
        params.push(scheduledTime);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay campos para actualizar'
        });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id, userId);

      await database.run(
        `UPDATE scheduled_messages SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
        params
      );

      // Obtener el mensaje actualizado
      const updatedMessage = await database.get(
        `SELECT sm.*, c.name as contact_name, c.whatsapp_id
         FROM scheduled_messages sm
         JOIN contacts c ON sm.contact_id = c.id
         WHERE sm.id = ?`,
        [id]
      );

      return res.json({
        success: true,
        data: { scheduledMessage: updatedMessage },
        message: 'Mensaje programado actualizado exitosamente'
      });

    } catch (error) {
      console.error('Update scheduled message error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar el mensaje programado'
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

      // Verificar que el mensaje existe y pertenece al usuario
      const existingMessage = await database.get(
        'SELECT status FROM scheduled_messages WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (!existingMessage) {
        return res.status(404).json({
          success: false,
          message: 'Mensaje programado no encontrado'
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
        'DELETE FROM scheduled_messages WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      return res.json({
        success: true,
        message: 'Mensaje programado eliminado exitosamente'
      });

    } catch (error) {
      console.error('Delete scheduled message error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar el mensaje programado'
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

      // Verificar que el mensaje existe y pertenece al usuario
      const existingMessage = await database.get(
        'SELECT status FROM scheduled_messages WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (!existingMessage) {
        return res.status(404).json({
          success: false,
          message: 'Mensaje programado no encontrado'
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
        'UPDATE scheduled_messages SET status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      return res.json({
        success: true,
        message: 'Mensaje programado cancelado exitosamente'
      });

    } catch (error) {
      console.error('Cancel scheduled message error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al cancelar el mensaje programado'
      });
    }
  }
}

export const scheduledMessagesController = new ScheduledMessagesController();
