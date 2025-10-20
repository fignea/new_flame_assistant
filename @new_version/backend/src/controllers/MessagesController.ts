import { Response } from 'express';
import { database } from '../config/database';
import { AuthenticatedRequest, ApiResponse } from '../types';

export interface Message {
  id: string;
  tenant_id: string;
  conversation_id: string;
  external_message_id: string;
  sender_type: string;
  sender_id?: string;
  content: string;
  message_type: string;
  media_url?: string;
  media_metadata?: any;
  is_from_me: boolean;
  is_auto_response: boolean;
  template_id?: string;
  assistant_id?: string;
  status: string;
  error_message?: string;
  quoted_message_id?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export class MessagesController {
  public async getAll(req: AuthenticatedRequest, res: Response<ApiResponse<Message[]>>) {
    try {
      const tenantId = req.user?.tenant_id;
      const { 
        page = 1, 
        limit = 50, 
        conversation_id,
        sender_type,
        message_type,
        is_from_me,
        is_auto_response,
        status,
        search
      } = req.query;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      let whereConditions = ['m.tenant_id = $1'];
      let params: any[] = [tenantId];
      let paramIndex = 2;

      if (conversation_id) {
        whereConditions.push(`m.conversation_id = $${paramIndex}`);
        params.push(conversation_id);
        paramIndex++;
      }

      if (sender_type) {
        whereConditions.push(`m.sender_type = $${paramIndex}`);
        params.push(sender_type);
        paramIndex++;
      }

      if (message_type) {
        whereConditions.push(`m.message_type = $${paramIndex}`);
        params.push(message_type);
        paramIndex++;
      }

      if (is_from_me !== undefined) {
        whereConditions.push(`m.is_from_me = $${paramIndex}`);
        params.push(is_from_me === 'true');
        paramIndex++;
      }

      if (is_auto_response !== undefined) {
        whereConditions.push(`m.is_auto_response = $${paramIndex}`);
        params.push(is_auto_response === 'true');
        paramIndex++;
      }

      if (status) {
        whereConditions.push(`m.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (search) {
        whereConditions.push(`m.content ILIKE $${paramIndex}`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      const offset = (Number(page) - 1) * Number(limit);

      const messages = await database.all(
        `SELECT 
          m.id, m.tenant_id, m.conversation_id, m.external_message_id,
          m.sender_type, m.sender_id, m.content, m.message_type, m.media_url,
          m.media_metadata, m.is_from_me, m.is_auto_response, m.template_id,
          m.assistant_id, m.status, m.error_message, m.quoted_message_id,
          m.metadata, m.created_at, m.updated_at,
          c.title as conversation_title, ct.name as contact_name,
          a.name as assistant_name
        FROM messages m
        LEFT JOIN conversations c ON m.conversation_id = c.id
        LEFT JOIN contacts ct ON c.contact_id = ct.id
        LEFT JOIN assistants a ON m.assistant_id = a.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY m.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, Number(limit), offset]
      );

      const total = await database.get(
        `SELECT COUNT(*) as count 
        FROM messages m
        WHERE ${whereConditions.join(' AND ')}`,
        params
      );

      return res.json({
        success: true,
        data: messages,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: total?.count || 0,
          pages: Math.ceil((total?.count || 0) / Number(limit))
        }
      });

    } catch (error) {
      console.error('Get messages error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo mensajes'
      });
    }
  }

  public async getById(req: AuthenticatedRequest, res: Response<ApiResponse<Message>>) {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenant_id;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const message = await database.get(
        `SELECT 
          m.id, m.tenant_id, m.conversation_id, m.external_message_id,
          m.sender_type, m.sender_id, m.content, m.message_type, m.media_url,
          m.media_metadata, m.is_from_me, m.is_auto_response, m.template_id,
          m.assistant_id, m.status, m.error_message, m.quoted_message_id,
          m.metadata, m.created_at, m.updated_at,
          c.title as conversation_title, ct.name as contact_name,
          a.name as assistant_name
        FROM messages m
        LEFT JOIN conversations c ON m.conversation_id = c.id
        LEFT JOIN contacts ct ON c.contact_id = ct.id
        LEFT JOIN assistants a ON m.assistant_id = a.id
        WHERE m.id = $1 AND m.tenant_id = $2`,
        [id, tenantId]
      );

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Mensaje no encontrado'
        });
      }

      return res.json({
        success: true,
        data: message
      });

    } catch (error) {
      console.error('Get message error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo mensaje'
      });
    }
  }

  public async create(req: AuthenticatedRequest, res: Response<ApiResponse<Message>>) {
    try {
      const tenantId = req.user?.tenant_id;
      const {
        conversation_id,
        external_message_id,
        sender_type,
        sender_id,
        content,
        message_type = 'text',
        media_url,
        media_metadata = {},
        is_from_me = false,
        is_auto_response = false,
        template_id,
        assistant_id,
        status = 'sent',
        quoted_message_id,
        metadata = {}
      } = req.body;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      if (!conversation_id || !external_message_id || !sender_type || !content) {
        return res.status(400).json({
          success: false,
          message: 'conversation_id, external_message_id, sender_type y content son requeridos'
        });
      }

      const message = await database.get(
        `INSERT INTO messages (
          tenant_id, conversation_id, external_message_id, sender_type, sender_id,
          content, message_type, media_url, media_metadata, is_from_me,
          is_auto_response, template_id, assistant_id, status, quoted_message_id, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
          tenantId, conversation_id, external_message_id, sender_type, sender_id,
          content, message_type, media_url, JSON.stringify(media_metadata), is_from_me,
          is_auto_response, template_id, assistant_id, status, quoted_message_id, JSON.stringify(metadata)
        ]
      );

      // Actualizar last_message_at en la conversación
      await database.run(
        `UPDATE conversations 
        SET last_message_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2`,
        [conversation_id, tenantId]
      );

      return res.status(201).json({
        success: true,
        data: message
      });

    } catch (error) {
      console.error('Create message error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error creando mensaje'
      });
    }
  }

  public async update(req: AuthenticatedRequest, res: Response<ApiResponse<Message>>) {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenant_id;
      const updateData = req.body;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Construir query dinámicamente
      const fields = [];
      const values = [];
      let paramIndex = 1;

      Object.keys(updateData).forEach(key => {
        if (key !== 'id' && key !== 'tenant_id' && key !== 'created_at') {
          fields.push(`${key} = $${paramIndex}`);
          if (key === 'media_metadata' || key === 'metadata') {
            values.push(JSON.stringify(updateData[key]));
          } else {
            values.push(updateData[key]);
          }
          paramIndex++;
        }
      });

      if (fields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay campos para actualizar'
        });
      }

      values.push(id, tenantId);
      const query = `
        UPDATE messages 
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
        RETURNING *
      `;

      const message = await database.get(query, values);

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Mensaje no encontrado'
        });
      }

      return res.json({
        success: true,
        data: message
      });

    } catch (error) {
      console.error('Update message error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error actualizando mensaje'
      });
    }
  }

  public async delete(req: AuthenticatedRequest, res: Response<ApiResponse<null>>) {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenant_id;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const result = await database.run(
        `DELETE FROM messages WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );

      if (result.changes === 0) {
        return res.status(404).json({
          success: false,
          message: 'Mensaje no encontrado'
        });
      }

      return res.json({
        success: true,
        data: null,
        message: 'Mensaje eliminado correctamente'
      });

    } catch (error) {
      console.error('Delete message error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error eliminando mensaje'
      });
    }
  }

  public async getByConversation(req: AuthenticatedRequest, res: Response<ApiResponse<Message[]>>) {
    try {
      const { conversationId } = req.params;
      const tenantId = req.user?.tenant_id;
      const { page = 1, limit = 100 } = req.query;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const offset = (Number(page) - 1) * Number(limit);

      const messages = await database.all(
        `SELECT 
          m.id, m.tenant_id, m.conversation_id, m.external_message_id,
          m.sender_type, m.sender_id, m.content, m.message_type, m.media_url,
          m.media_metadata, m.is_from_me, m.is_auto_response, m.template_id,
          m.assistant_id, m.status, m.error_message, m.quoted_message_id,
          m.metadata, m.created_at, m.updated_at,
          ct.name as contact_name, a.name as assistant_name
        FROM messages m
        LEFT JOIN conversations c ON m.conversation_id = c.id
        LEFT JOIN contacts ct ON c.contact_id = ct.id
        LEFT JOIN assistants a ON m.assistant_id = a.id
        WHERE m.conversation_id = $1 AND m.tenant_id = $2
        ORDER BY m.created_at ASC
        LIMIT $3 OFFSET $4`,
        [conversationId, tenantId, Number(limit), offset]
      );

      const total = await database.get(
        `SELECT COUNT(*) as count 
        FROM messages 
        WHERE conversation_id = $1 AND tenant_id = $2`,
        [conversationId, tenantId]
      );

      return res.json({
        success: true,
        data: messages,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: total?.count || 0,
          pages: Math.ceil((total?.count || 0) / Number(limit))
        }
      });

    } catch (error) {
      console.error('Get messages by conversation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo mensajes de la conversación'
      });
    }
  }
}

export const messagesController = new MessagesController();
