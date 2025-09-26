import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { database } from '../config/database';

export class AssistantsController {
  public async create(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { name, description, type, integrations, responses } = req.body;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      if (!name || !type) {
        return res.status(400).json({
          success: false,
          message: 'Nombre y tipo son requeridos'
        });
      }

      // Crear asistente
      const result = await database.run(
        `INSERT INTO assistants 
         (user_id, name, description, type, integrations, responses, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId, 
          name, 
          description || '', 
          type, 
          JSON.stringify(integrations || []), 
          JSON.stringify(responses || {}),
          'active'
        ]
      );

      // Obtener el asistente creado
      const assistant = await database.get(
        'SELECT * FROM assistants WHERE id = ?',
        [result.id]
      );

      return res.status(201).json({
        success: true,
        data: assistant,
        message: 'Asistente creado exitosamente'
      });

    } catch (error) {
      console.error('Create assistant error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al crear el asistente'
      });
    }
  }

  public async getAll(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 10, status, type } = req.query;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      let whereClause = 'WHERE user_id = $1';
      const params: any[] = [userId];
      let paramIndex = 2;

      if (status) {
        whereClause += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (type) {
        whereClause += ` AND type = $${paramIndex}`;
        params.push(type);
        paramIndex++;
      }

      // Obtener total de asistentes
      const countQuery = `SELECT COUNT(*) as total FROM assistants WHERE user_id = $1`;
      console.log('Count query:', countQuery);
      console.log('Count params:', [userId]);
      const countResult = await database.get(countQuery, [userId]);
      const total = countResult?.total || 0;

      // Obtener asistentes con paginación
      const offset = (Number(page) - 1) * Number(limit);
      const assistantsQuery = `SELECT * FROM assistants WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
      console.log('Assistants query:', assistantsQuery);
      console.log('Assistants params:', [userId, Number(limit), offset]);
      const assistants = await database.query(assistantsQuery, [userId, Number(limit), offset]);

      // Parsear JSON fields
      const parsedAssistants = assistants.rows.map((assistant: any) => ({
        ...assistant,
        integrations: JSON.parse(assistant.integrations || '[]'),
        responses: JSON.parse(assistant.responses || '{}')
      }));

      return res.json({
        success: true,
        data: {
          data: parsedAssistants,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        }
      });

    } catch (error: any) {
      console.error('Get assistants error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code
      });
      return res.status(500).json({
        success: false,
        message: 'Error al obtener los asistentes',
        error: error.message
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

      const assistant = await database.get(
        'SELECT * FROM assistants WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (!assistant) {
        return res.status(404).json({
          success: false,
          message: 'Asistente no encontrado'
        });
      }

      // Parsear JSON fields
      const parsedAssistant = {
        ...assistant,
        integrations: JSON.parse(assistant.integrations || '[]'),
        responses: JSON.parse(assistant.responses || '{}')
      };

      return res.json({
        success: true,
        data: parsedAssistant
      });

    } catch (error) {
      console.error('Get assistant error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener el asistente'
      });
    }
  }

  public async update(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { name, description, type, integrations, responses, status } = req.body;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar que el asistente existe y pertenece al usuario
      const existingAssistant = await database.get(
        'SELECT * FROM assistants WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (!existingAssistant) {
        return res.status(404).json({
          success: false,
          message: 'Asistente no encontrado'
        });
      }

      // Construir query de actualización
      const updates: string[] = [];
      const params: any[] = [];

      if (name !== undefined) {
        updates.push('name = ?');
        params.push(name);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description);
      }
      if (type !== undefined) {
        updates.push('type = ?');
        params.push(type);
      }
      if (integrations !== undefined) {
        updates.push('integrations = ?');
        params.push(JSON.stringify(integrations));
      }
      if (responses !== undefined) {
        updates.push('responses = ?');
        params.push(JSON.stringify(responses));
      }
      if (status !== undefined) {
        updates.push('status = ?');
        params.push(status);
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
        `UPDATE assistants SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
        params
      );

      // Obtener el asistente actualizado
      const updatedAssistant = await database.get(
        'SELECT * FROM assistants WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      // Parsear JSON fields
      const parsedAssistant = {
        ...updatedAssistant,
        integrations: JSON.parse(updatedAssistant.integrations || '[]'),
        responses: JSON.parse(updatedAssistant.responses || '{}')
      };

      return res.json({
        success: true,
        data: parsedAssistant,
        message: 'Asistente actualizado exitosamente'
      });

    } catch (error) {
      console.error('Update assistant error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar el asistente'
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

      // Verificar que el asistente existe y pertenece al usuario
      const existingAssistant = await database.get(
        'SELECT * FROM assistants WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (!existingAssistant) {
        return res.status(404).json({
          success: false,
          message: 'Asistente no encontrado'
        });
      }

      // Eliminar asistente
      await database.run(
        'DELETE FROM assistants WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      return res.json({
        success: true,
        message: 'Asistente eliminado exitosamente'
      });

    } catch (error) {
      console.error('Delete assistant error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar el asistente'
      });
    }
  }

  public async toggleStatus(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar que el asistente existe y pertenece al usuario
      const existingAssistant = await database.get(
        'SELECT * FROM assistants WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (!existingAssistant) {
        return res.status(404).json({
          success: false,
          message: 'Asistente no encontrado'
        });
      }

      // Cambiar estado
      const newStatus = existingAssistant.status === 'active' ? 'inactive' : 'active';
      
      await database.run(
        'UPDATE assistants SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
        [newStatus, id, userId]
      );

      return res.json({
        success: true,
        data: { status: newStatus },
        message: `Asistente ${newStatus === 'active' ? 'activado' : 'desactivado'} exitosamente`
      });

    } catch (error) {
      console.error('Toggle assistant status error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al cambiar el estado del asistente'
      });
    }
  }

  public async getStats(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar que el asistente existe y pertenece al usuario
      const existingAssistant = await database.get(
        'SELECT * FROM assistants WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (!existingAssistant) {
        return res.status(404).json({
          success: false,
          message: 'Asistente no encontrado'
        });
      }

      // Obtener estadísticas básicas
      const stats = {
        totalMessages: 0,
        activeConversations: 0,
        responseTime: 0,
        satisfaction: 0
      };

      return res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get assistant stats error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener las estadísticas del asistente'
      });
    }
  }
}

export const assistantsController = new AssistantsController();
