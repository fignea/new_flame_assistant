import { Response } from 'express';
import { database } from '../config/database';
import { AuthenticatedRequest, ApiResponse } from '../types';

export interface Assistant {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  prompt?: string;
  is_active: boolean;
  ai_provider: string;
  model: string;
  max_tokens: number;
  temperature: number;
  auto_assign: boolean;
  response_delay: number;
  working_hours?: any;
  business_hours?: any;
  fallback_message?: string;
  config?: any;
  created_at: string;
  updated_at: string;
}

export class AssistantsController {
  public async getAll(req: AuthenticatedRequest, res: Response<ApiResponse<Assistant[]>>) {
    try {
      const tenantId = req.user?.tenant_id;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const assistants = await database.all(
        `SELECT 
          id, tenant_id, name, description, prompt, is_active, ai_provider, model,
          max_tokens, temperature, auto_assign, response_delay, working_hours,
          business_hours, fallback_message, config, created_at, updated_at
        FROM assistants 
        WHERE tenant_id = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC`,
        [tenantId]
      );

      return res.json({
        success: true,
        data: assistants
      });

    } catch (error) {
      console.error('Get assistants error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo asistentes'
      });
    }
  }

  public async getById(req: AuthenticatedRequest, res: Response<ApiResponse<Assistant>>) {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenant_id;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const assistant = await database.get(
        `SELECT 
          id, tenant_id, name, description, prompt, is_active, ai_provider, model,
          max_tokens, temperature, auto_assign, response_delay, working_hours,
          business_hours, fallback_message, config, created_at, updated_at
        FROM assistants 
        WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [id, tenantId]
      );

      if (!assistant) {
        return res.status(404).json({
          success: false,
          message: 'Asistente no encontrado'
        });
      }

      return res.json({
        success: true,
        data: assistant
      });

    } catch (error) {
      console.error('Get assistant error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo asistente'
      });
    }
  }

  public async create(req: AuthenticatedRequest, res: Response<ApiResponse<Assistant>>) {
    try {
      const tenantId = req.user?.tenant_id;
      const {
        name,
        description,
        prompt,
        ai_provider = 'openai',
        model = 'gpt-3.5-turbo',
        max_tokens = 150,
        temperature = 0.7,
        auto_assign = true,
        response_delay = 0,
        working_hours = {},
        business_hours = {},
        fallback_message,
        config = {}
      } = req.body;
      
      if (!tenantId) {
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

      const assistant = await database.get(
        `INSERT INTO assistants (
          tenant_id, name, description, prompt, is_active, ai_provider, model,
          max_tokens, temperature, auto_assign, response_delay, working_hours,
          business_hours, fallback_message, config
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          tenantId, name, description, prompt, true, ai_provider, model,
          max_tokens, temperature, auto_assign, response_delay, JSON.stringify(working_hours),
          JSON.stringify(business_hours), fallback_message, JSON.stringify(config)
        ]
      );

      return res.status(201).json({
        success: true,
        data: assistant
      });

    } catch (error) {
      console.error('Create assistant error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error creando asistente'
      });
    }
  }

  public async update(req: AuthenticatedRequest, res: Response<ApiResponse<Assistant>>) {
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
          values.push(updateData[key]);
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
        UPDATE assistants 
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} AND deleted_at IS NULL
        RETURNING *
      `;

      const assistant = await database.get(query, values);

      if (!assistant) {
        return res.status(404).json({
          success: false,
          message: 'Asistente no encontrado'
        });
      }

      return res.json({
        success: true,
        data: assistant
      });

    } catch (error) {
      console.error('Update assistant error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error actualizando asistente'
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
        `UPDATE assistants 
        SET deleted_at = NOW() 
        WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [id, tenantId]
      );

      if (result.changes === 0) {
        return res.status(404).json({
          success: false,
          message: 'Asistente no encontrado'
        });
      }

      return res.json({
        success: true,
        data: null,
        message: 'Asistente eliminado correctamente'
      });

    } catch (error) {
      console.error('Delete assistant error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error eliminando asistente'
      });
    }
  }

  public async getMetrics(req: AuthenticatedRequest, res: Response<ApiResponse<any>>) {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenant_id;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const metrics = await database.get(
        `SELECT 
          total_conversations,
          total_messages,
          auto_responses,
          avg_response_time,
          avg_satisfaction
        FROM assistant_metrics 
        WHERE assistant_id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );

      if (!metrics) {
        return res.status(404).json({
          success: false,
          message: 'Métricas no encontradas'
        });
      }

      return res.json({
        success: true,
        data: metrics
      });

    } catch (error) {
      console.error('Get assistant metrics error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo métricas del asistente'
      });
    }
  }

  public async getStats(req: AuthenticatedRequest, res: Response<ApiResponse<any>>) {
    try {
      const tenantId = req.user?.tenant_id;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Obtener estadísticas generales de asistentes
      const totalAssistants = await database.get(`
        SELECT COUNT(*) as total
        FROM assistants 
        WHERE tenant_id = $1 AND deleted_at IS NULL
      `, [tenantId]) as any;

      const activeAssistants = await database.get(`
        SELECT COUNT(*) as total
        FROM assistants 
        WHERE tenant_id = $1 AND is_active = true AND deleted_at IS NULL
      `, [tenantId]) as any;

      const inactiveAssistants = await database.get(`
        SELECT COUNT(*) as total
        FROM assistants 
        WHERE tenant_id = $1 AND is_active = false AND deleted_at IS NULL
      `, [tenantId]) as any;

      // Obtener estadísticas de uso (conversaciones asignadas)
      const conversationsStats = await database.get(`
        SELECT 
          COUNT(*) as total_conversations,
          COUNT(CASE WHEN c.status = 'active' THEN 1 END) as active_conversations,
          COUNT(CASE WHEN c.status = 'closed' THEN 1 END) as closed_conversations
        FROM conversations c
        WHERE c.tenant_id = $1 AND c.assigned_to IS NOT NULL
      `, [tenantId]) as any;

      const stats = {
        total: parseInt(totalAssistants.total) || 0,
        active: parseInt(activeAssistants.total) || 0,
        inactive: parseInt(inactiveAssistants.total) || 0,
        conversations: {
          total: parseInt(conversationsStats.total_conversations) || 0,
          active: parseInt(conversationsStats.active_conversations) || 0,
          closed: parseInt(conversationsStats.closed_conversations) || 0
        }
      };

      return res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas de asistentes:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas de asistentes'
      });
    }
  }
}

export const assistantsController = new AssistantsController();