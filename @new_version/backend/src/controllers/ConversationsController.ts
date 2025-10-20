import { Response } from 'express';
import { database } from '../config/database';
import { AuthenticatedRequest, ApiResponse } from '../types';

export interface Conversation {
  id: string;
  tenant_id: string;
  contact_id: string;
  platform: string;
  external_conversation_id: string;
  title?: string;
  status: string;
  priority: string;
  assigned_to?: string;
  assistant_id?: string;
  tags: string[];
  metadata?: any;
  last_message_at?: string;
  first_response_at?: string;
  resolution_time?: number;
  satisfaction_score?: number;
  created_at: string;
  updated_at: string;
}

export class ConversationsController {
  public async getAll(req: AuthenticatedRequest, res: Response<ApiResponse<Conversation[]>>) {
    try {
      const tenantId = req.user?.tenant_id;
      const { 
        page = 1, 
        limit = 50, 
        status, 
        priority, 
        assigned_to, 
        assistant_id,
        contact_id,
        platform,
        search
      } = req.query;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      let whereConditions = ['c.tenant_id = $1'];
      let params: any[] = [tenantId];
      let paramIndex = 2;

      if (status) {
        whereConditions.push(`c.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (priority) {
        whereConditions.push(`c.priority = $${paramIndex}`);
        params.push(priority);
        paramIndex++;
      }

      if (assigned_to) {
        whereConditions.push(`c.assigned_to = $${paramIndex}`);
        params.push(assigned_to);
        paramIndex++;
      }

      if (assistant_id) {
        whereConditions.push(`c.assistant_id = $${paramIndex}`);
        params.push(assistant_id);
        paramIndex++;
      }

      if (contact_id) {
        whereConditions.push(`c.contact_id = $${paramIndex}`);
        params.push(contact_id);
        paramIndex++;
      }

      if (platform) {
        whereConditions.push(`c.platform = $${paramIndex}`);
        params.push(platform);
        paramIndex++;
      }

      if (search) {
        whereConditions.push(`(c.title ILIKE $${paramIndex} OR ct.name ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      const offset = (Number(page) - 1) * Number(limit);

      const conversations = await database.all(
        `SELECT 
          c.id, c.tenant_id, c.contact_id, c.platform, c.external_conversation_id,
          c.title, c.status, c.priority, c.assigned_to, c.assistant_id, c.tags,
          c.metadata, c.last_message_at, c.first_response_at, c.resolution_time,
          c.satisfaction_score, c.created_at, c.updated_at,
          ct.name as contact_name, ct.phone as contact_phone, ct.email as contact_email,
          u.name as assigned_user_name, a.name as assistant_name
        FROM conversations c
        LEFT JOIN contacts ct ON c.contact_id = ct.id
        LEFT JOIN users u ON c.assigned_to = u.id
        LEFT JOIN assistants a ON c.assistant_id = a.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, Number(limit), offset]
      );

      const total = await database.get(
        `SELECT COUNT(*) as count 
        FROM conversations c
        LEFT JOIN contacts ct ON c.contact_id = ct.id
        WHERE ${whereConditions.join(' AND ')}`,
        params
      );

      return res.json({
        success: true,
        data: conversations,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: total?.count || 0,
          pages: Math.ceil((total?.count || 0) / Number(limit))
        }
      });

    } catch (error) {
      console.error('Get conversations error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo conversaciones'
      });
    }
  }

  public async getById(req: AuthenticatedRequest, res: Response<ApiResponse<Conversation>>) {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenant_id;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const conversation = await database.get(
        `SELECT 
          c.id, c.tenant_id, c.contact_id, c.platform, c.external_conversation_id,
          c.title, c.status, c.priority, c.assigned_to, c.assistant_id, c.tags,
          c.metadata, c.last_message_at, c.first_response_at, c.resolution_time,
          c.satisfaction_score, c.created_at, c.updated_at,
          ct.name as contact_name, ct.phone as contact_phone, ct.email as contact_email,
          u.name as assigned_user_name, a.name as assistant_name
        FROM conversations c
        LEFT JOIN contacts ct ON c.contact_id = ct.id
        LEFT JOIN users u ON c.assigned_to = u.id
        LEFT JOIN assistants a ON c.assistant_id = a.id
        WHERE c.id = $1 AND c.tenant_id = $2`,
        [id, tenantId]
      );

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

  public async create(req: AuthenticatedRequest, res: Response<ApiResponse<Conversation>>) {
    try {
      const tenantId = req.user?.tenant_id;
      const {
        contact_id,
        platform,
        external_conversation_id,
        title,
        status = 'active',
        priority = 'normal',
        assigned_to,
        assistant_id,
        tags = [],
        metadata = {}
      } = req.body;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      if (!contact_id || !platform || !external_conversation_id) {
        return res.status(400).json({
          success: false,
          message: 'contact_id, platform y external_conversation_id son requeridos'
        });
      }

      const conversation = await database.get(
        `INSERT INTO conversations (
          tenant_id, contact_id, platform, external_conversation_id, title,
          status, priority, assigned_to, assistant_id, tags, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          tenantId, contact_id, platform, external_conversation_id, title,
          status, priority, assigned_to, assistant_id, tags, JSON.stringify(metadata)
        ]
      );

      return res.status(201).json({
        success: true,
        data: conversation
      });

    } catch (error) {
      console.error('Create conversation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error creando conversación'
      });
    }
  }

  public async update(req: AuthenticatedRequest, res: Response<ApiResponse<Conversation>>) {
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
          if (key === 'metadata') {
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
        UPDATE conversations 
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
        RETURNING *
      `;

      const conversation = await database.get(query, values);

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
        `DELETE FROM conversations WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );

      if (result.changes === 0) {
        return res.status(404).json({
          success: false,
          message: 'Conversación no encontrada'
        });
      }

      return res.json({
        success: true,
        data: null,
        message: 'Conversación eliminada correctamente'
      });

    } catch (error) {
      console.error('Delete conversation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error eliminando conversación'
      });
    }
  }

  public async assign(req: AuthenticatedRequest, res: Response<ApiResponse<Conversation>>) {
    try {
      const { id } = req.params;
      const { assigned_to, assistant_id } = req.body;
      const tenantId = req.user?.tenant_id;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const conversation = await database.get(
        `UPDATE conversations 
        SET assigned_to = $1, assistant_id = $2, updated_at = NOW()
        WHERE id = $3 AND tenant_id = $4
        RETURNING *`,
        [assigned_to, assistant_id, id, tenantId]
      );

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversación no encontrada'
        });
      }

      return res.json({
        success: true,
        data: conversation,
        message: 'Conversación asignada correctamente'
      });

    } catch (error) {
      console.error('Assign conversation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error asignando conversación'
      });
    }
  }

  public async updateStatus(req: AuthenticatedRequest, res: Response<ApiResponse<Conversation>>) {
    try {
      const { id } = req.params;
      const { status, resolution_time, satisfaction_score } = req.body;
      const tenantId = req.user?.tenant_id;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const conversation = await database.get(
        `UPDATE conversations 
        SET status = $1, resolution_time = $2, satisfaction_score = $3, updated_at = NOW()
        WHERE id = $4 AND tenant_id = $5
        RETURNING *`,
        [status, resolution_time, satisfaction_score, id, tenantId]
      );

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversación no encontrada'
        });
      }

      return res.json({
        success: true,
        data: conversation,
        message: 'Estado de conversación actualizado correctamente'
      });

    } catch (error) {
      console.error('Update conversation status error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error actualizando estado de conversación'
      });
    }
  }
}

export const conversationsController = new ConversationsController();
