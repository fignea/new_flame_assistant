import { Request, Response } from 'express';
import { AuthenticatedRequest, ApiResponse, Conversation, Message, PaginatedResponse } from '../types';
import { database } from '../config/database';

export class WebChatController {
  public async getWebChatConversations(req: AuthenticatedRequest, res: Response<PaginatedResponse<Conversation>>) {
    try {
      const { page = 1, limit = 10, status, assigned_to } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      
      let whereClause = 'WHERE tenant_id = $1 AND platform = \'web_chat\'';
      const params: any[] = [req.tenant?.id];
      
      if (status) {
        whereClause += ' AND status = $' + (params.length + 1);
        params.push(status);
      }
      
      if (assigned_to) {
        whereClause += ' AND assigned_to = $' + (params.length + 1);
        params.push(assigned_to);
      }

      const conversations = await database.all(`
        SELECT 
          c.id, c.tenant_id, c.contact_id, c.platform, c.status, c.priority, c.assigned_to,
          c.title, c.last_message_at, c.created_at, c.updated_at,
          co.name as contact_name, co.email as contact_email, co.phone as contact_phone
        FROM conversations c
        LEFT JOIN contacts co ON c.contact_id = co.id
        WHERE c.tenant_id = $1 AND c.platform = 'web_chat'
        ORDER BY c.last_message_at DESC
        LIMIT $2 OFFSET $3
      `, [req.tenant?.id, Number(limit), offset]);

      const total = await database.get(`
        SELECT COUNT(*) as count
        FROM conversations c
        WHERE c.tenant_id = $1 AND c.platform = 'web_chat'
      `, [req.tenant?.id]) as any;

      return res.json({
        success: true,
        data: conversations,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: total.count,
          pages: Math.ceil(total.count / Number(limit))
        }
      });
    } catch (error) {
      console.error('Get web chat conversations error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo conversaciones de web chat',
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0
        }
      });
    }
  }

  public async createConversation(req: Request, res: Response<ApiResponse<Conversation>>) {
    try {
      const { contact_name, contact_email, contact_phone, message } = req.body;
      
      if (!contact_name || !message) {
        return res.status(400).json({
          success: false,
          message: 'Nombre del contacto y mensaje son requeridos'
        });
      }

      // Crear o encontrar el contacto
      let contact = await database.get(`
        SELECT id FROM contacts
        WHERE email = $1 OR phone = $2
        LIMIT 1
      `, [contact_email, contact_phone]);

      if (!contact) {
        contact = await database.get(`
          INSERT INTO contacts (tenant_id, name, email, phone, platform, external_id, created_at, updated_at)
          VALUES ($1, $2, $3, $4, 'web_chat', $5, NOW(), NOW())
          RETURNING id
        `, [1, contact_name, contact_email, contact_phone, `web_${Date.now()}`]); // Usar tenant_id = 1 para web chat público
      }

      // Crear la conversación
      const conversation = await database.get(`
        INSERT INTO conversations (tenant_id, contact_id, platform, status, title, last_message_at, created_at, updated_at)
        VALUES ($1, $2, 'web_chat', 'active', 'Consulta Web Chat', NOW(), NOW(), NOW())
        RETURNING id, tenant_id, contact_id, platform, status, title, last_message_at, created_at, updated_at
      `, [1, contact.id]); // Usar tenant_id = 1 para web chat público

      // Crear el primer mensaje
      await database.run(`
        INSERT INTO messages (tenant_id, conversation_id, sender_id, sender_type, content, message_type, created_at, updated_at)
        VALUES ($1, $2, $3, 'visitor', $4, 'text', NOW(), NOW())
      `, [1, conversation.id, contact.id, message]);

      return res.status(201).json({
        success: true,
        data: conversation
      });
    } catch (error) {
      console.error('Create web chat conversation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error creando conversación de web chat'
      });
    }
  }

  public async getConversation(req: Request, res: Response<ApiResponse<Conversation>>) {
    try {
      const { id } = req.params;
      
      const conversation = await database.get(`
        SELECT 
          c.id, c.tenant_id, c.contact_id, c.platform, c.status, c.priority, c.assigned_to,
          c.title, c.last_message_at, c.created_at, c.updated_at,
          co.name as contact_name, co.email as contact_email, co.phone as contact_phone
        FROM conversations c
        LEFT JOIN contacts co ON c.contact_id = co.id
        WHERE c.id = $1
      `, [id]);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversación no encontrada'
        });
      }

      return res.json({
        success: true,
        data: conversation
      });
    } catch (error) {
      console.error('Get conversation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo conversación'
      });
    }
  }

  public async sendMessage(req: Request, res: Response<ApiResponse<Message>>) {
    try {
      const { id: conversationId } = req.params;
      const { content, sender_type = 'visitor' } = req.body;
      
      if (!content) {
        return res.status(400).json({
          success: false,
          message: 'El contenido del mensaje es requerido'
        });
      }

      // Verificar que la conversación existe
      const conversation = await database.get(`
        SELECT id, contact_id FROM conversations WHERE id = $1
      `, [conversationId]);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversación no encontrada'
        });
      }

      // Crear el mensaje
      const message = await database.get(`
        INSERT INTO messages (tenant_id, conversation_id, sender_id, sender_type, content, message_type, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'text', NOW(), NOW())
        RETURNING id, tenant_id, conversation_id, sender_id, sender_type, content, message_type, created_at, updated_at
      `, [1, conversationId, conversation.contact_id, sender_type, content]);

      // Actualizar last_message_at de la conversación
      await database.run(`
        UPDATE conversations
        SET last_message_at = NOW(), updated_at = NOW()
        WHERE id = $1
      `, [conversationId]);

      return res.status(201).json({
        success: true,
        data: message
      });
    } catch (error) {
      console.error('Send message error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error enviando mensaje'
      });
    }
  }

  public async updateConversation(req: AuthenticatedRequest, res: Response<ApiResponse<Conversation>>) {
    try {
      const { id } = req.params;
      const { status, priority, assigned_to, title } = req.body;
      
      const conversation = await database.get(`
        UPDATE conversations
        SET status = COALESCE($3, status),
            priority = COALESCE($4, priority),
            assigned_to = COALESCE($5, assigned_to),
            title = COALESCE($6, title),
            updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
        RETURNING id, tenant_id, contact_id, platform, status, priority, assigned_to, title, last_message_at, created_at, updated_at
      `, [id, req.tenant?.id, status, priority, assigned_to, title]);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversación no encontrada'
        });
      }

      return res.json({
        success: true,
        data: conversation
      });
    } catch (error) {
      console.error('Update conversation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error actualizando conversación'
      });
    }
  }

  public async deleteConversation(req: AuthenticatedRequest, res: Response<ApiResponse<any>>) {
    try {
      const { id } = req.params;
      
      const result = await database.run(`
        DELETE FROM conversations
        WHERE id = $1 AND tenant_id = $2
      `, [id, req.tenant?.id]);

      if (result.changes === 0) {
        return res.status(404).json({
          success: false,
          message: 'Conversación no encontrada'
        });
      }

      return res.json({
        success: true,
        data: { deleted: true }
      });
    } catch (error) {
      console.error('Delete conversation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error eliminando conversación'
      });
    }
  }

  public async assignConversation(req: AuthenticatedRequest, res: Response<ApiResponse<Conversation>>) {
    try {
      const { id } = req.params;
      const { assigned_to } = req.body;
      
      const conversation = await database.get(`
        UPDATE conversations
        SET assigned_to = $3, updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
        RETURNING id, tenant_id, contact_id, platform, status, priority, assigned_to, title, last_message_at, created_at, updated_at
      `, [id, req.tenant?.id, assigned_to]);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversación no encontrada'
        });
      }

      return res.json({
        success: true,
        data: conversation
      });
    } catch (error) {
      console.error('Assign conversation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error asignando conversación'
      });
    }
  }
}

export const webchatController = new WebChatController();
