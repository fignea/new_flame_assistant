import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse, CreateAssistantRequest, UpdateAssistantRequest } from '../types';
import { database } from '../config/database';
import { OpenAIService } from '../services/OpenAIService';

export class AssistantsController {
  public async create(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const assistantData: CreateAssistantRequest = req.body;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      if (!assistantData.name) {
        return res.status(400).json({
          success: false,
          message: 'El nombre es requerido'
        });
      }

      // Validar API key de OpenAI si se proporciona
      if (assistantData.openai_api_key) {
        const isValidKey = await OpenAIService.validateApiKey(assistantData.openai_api_key);
        if (!isValidKey) {
          return res.status(400).json({
            success: false,
            message: 'API key de OpenAI inválida'
          });
        }
      }

      // Crear asistente con nueva estructura
      await database.run(
        `INSERT INTO assistants 
         (user_id, name, description, prompt, is_active, openai_api_key, model, 
          max_tokens, temperature, auto_assign, response_delay, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          userId, 
          assistantData.name, 
          assistantData.description || null,
          assistantData.prompt || null,
          assistantData.is_active !== undefined ? assistantData.is_active : true,
          assistantData.openai_api_key || null,
          assistantData.model || 'gpt-3.5-turbo',
          assistantData.max_tokens || 150,
          assistantData.temperature || 0.7,
          assistantData.auto_assign !== undefined ? assistantData.auto_assign : true,
          assistantData.response_delay || 0
        ]
      );

      // Obtener el asistente creado
      const assistant = await database.get(
        'SELECT * FROM assistants WHERE user_id = $1 AND name = $2 ORDER BY created_at DESC LIMIT 1',
        [userId, assistantData.name]
      );

      return res.status(201).json({
        success: true,
        data: assistant,
        message: 'Asistente creado exitosamente'
      });

    } catch (error: any) {
      console.error('Create assistant error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al crear el asistente',
        error: error.message
      });
    }
  }

  public async getAll(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 10, is_active } = req.query;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      let whereClause = 'WHERE user_id = $1';
      const params: any[] = [userId];
      let paramIndex = 2;

      if (is_active !== undefined) {
        whereClause += ` AND is_active = $${paramIndex}`;
        params.push(is_active === 'true');
        paramIndex++;
      }

      // Obtener total de asistentes
      const countQuery = `SELECT COUNT(*) as total FROM assistants ${whereClause}`;
      const countResult = await database.get(countQuery, params);
      const total = countResult?.total || 0;

      // Obtener asistentes con paginación
      const offset = (Number(page) - 1) * Number(limit);
      const assistantsQuery = `SELECT * FROM assistants ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      const assistants = await database.all(assistantsQuery, [...params, Number(limit), offset]);

      return res.json({
        success: true,
        data: {
          data: assistants,
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
        'SELECT * FROM assistants WHERE id = $1 AND user_id = $2',
        [id, userId]
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

    } catch (error: any) {
      console.error('Get assistant error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener el asistente',
        error: error.message
      });
    }
  }

  public async update(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const updates: UpdateAssistantRequest = req.body;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar que el asistente existe y pertenece al usuario
      const existingAssistant = await database.get(
        'SELECT * FROM assistants WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (!existingAssistant) {
        return res.status(404).json({
          success: false,
          message: 'Asistente no encontrado'
        });
      }

      // Validar API key de OpenAI si se proporciona
      if (updates.openai_api_key) {
        const isValidKey = await OpenAIService.validateApiKey(updates.openai_api_key);
        if (!isValidKey) {
          return res.status(400).json({
            success: false,
            message: 'API key de OpenAI inválida'
          });
        }
      }

      // Construir query de actualización
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        params.push(updates.name);
      }
      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        params.push(updates.description);
      }
      if (updates.prompt !== undefined) {
        updateFields.push(`prompt = $${paramIndex++}`);
        params.push(updates.prompt);
      }
      if (updates.is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        params.push(updates.is_active);
      }
      if (updates.openai_api_key !== undefined) {
        updateFields.push(`openai_api_key = $${paramIndex++}`);
        params.push(updates.openai_api_key);
      }
      if (updates.model !== undefined) {
        updateFields.push(`model = $${paramIndex++}`);
        params.push(updates.model);
      }
      if (updates.max_tokens !== undefined) {
        updateFields.push(`max_tokens = $${paramIndex++}`);
        params.push(updates.max_tokens);
      }
      if (updates.temperature !== undefined) {
        updateFields.push(`temperature = $${paramIndex++}`);
        params.push(updates.temperature);
      }
      if (updates.auto_assign !== undefined) {
        updateFields.push(`auto_assign = $${paramIndex++}`);
        params.push(updates.auto_assign);
      }
      if (updates.response_delay !== undefined) {
        updateFields.push(`response_delay = $${paramIndex++}`);
        params.push(updates.response_delay);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay campos para actualizar'
        });
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(id, userId);

      await database.run(
        `UPDATE assistants SET ${updateFields.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
        params
      );

      // Obtener el asistente actualizado
      const updatedAssistant = await database.get(
        'SELECT * FROM assistants WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      return res.json({
        success: true,
        data: updatedAssistant,
        message: 'Asistente actualizado exitosamente'
      });

    } catch (error: any) {
      console.error('Update assistant error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar el asistente',
        error: error.message
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
        'SELECT * FROM assistants WHERE id = $1 AND user_id = $2',
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
        'DELETE FROM assistants WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      return res.json({
        success: true,
        message: 'Asistente eliminado exitosamente'
      });

    } catch (error: any) {
      console.error('Delete assistant error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar el asistente',
        error: error.message
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
        'SELECT * FROM assistants WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (!existingAssistant) {
        return res.status(404).json({
          success: false,
          message: 'Asistente no encontrado'
        });
      }

      // Cambiar estado
      const newStatus = !existingAssistant.is_active;
      
      await database.run(
        'UPDATE assistants SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3',
        [newStatus, id, userId]
      );

      return res.json({
        success: true,
        data: { is_active: newStatus },
        message: `Asistente ${newStatus ? 'activado' : 'desactivado'} exitosamente`
      });

    } catch (error: any) {
      console.error('Toggle assistant status error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al cambiar el estado del asistente',
        error: error.message
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
        'SELECT * FROM assistants WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (!existingAssistant) {
        return res.status(404).json({
          success: false,
          message: 'Asistente no encontrado'
        });
      }

      // Obtener estadísticas del asistente
      const stats = await database.get(
        `SELECT 
           COUNT(DISTINCT aa.conversation_id) as total_conversations,
           COUNT(DISTINCT CASE WHEN aa.is_active = true THEN aa.conversation_id END) as active_conversations,
           COUNT(m.id) as total_messages,
           COUNT(CASE WHEN m.is_auto_response = true THEN 1 END) as auto_responses,
           COUNT(CASE WHEN m.is_auto_response = false AND m.is_from_me = true THEN 1 END) as manual_responses
         FROM assistants a
         LEFT JOIN assistant_assignments aa ON a.id = aa.assistant_id
         LEFT JOIN messages m ON aa.conversation_id = m.chat_id AND m.assistant_id = a.id
         WHERE a.id = $1 AND a.user_id = $2`,
        [id, userId]
      );

      return res.json({
        success: true,
        data: {
          assistant_id: parseInt(id),
          total_conversations: stats?.total_conversations || 0,
          active_conversations: stats?.active_conversations || 0,
          total_messages: stats?.total_messages || 0,
          auto_responses: stats?.auto_responses || 0,
          manual_responses: stats?.manual_responses || 0,
          average_response_time: 0, // TODO: Implementar cálculo de tiempo de respuesta
          satisfaction_score: null // TODO: Implementar sistema de satisfacción
        }
      });

    } catch (error: any) {
      console.error('Get assistant stats error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener las estadísticas del asistente',
        error: error.message
      });
    }
  }

  /**
   * Obtener modelos disponibles de OpenAI
   * GET /api/assistants/models
   */
  public async getAvailableModels(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { api_key } = req.query;
      
      if (!api_key) {
        return res.status(400).json({
          success: false,
          message: 'API key de OpenAI es requerida'
        });
      }

      const models = await OpenAIService.getAvailableModels(api_key as string);

      return res.json({
        success: true,
        data: models
      });

    } catch (error: any) {
      console.error('Get available models error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener los modelos disponibles',
        error: error.message
      });
    }
  }

  /**
   * Validar API key de OpenAI
   * POST /api/assistants/validate-key
   */
  public async validateApiKey(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { api_key } = req.body;
      
      if (!api_key) {
        return res.status(400).json({
          success: false,
          message: 'API key de OpenAI es requerida'
        });
      }

      const isValid = await OpenAIService.validateApiKey(api_key);

      return res.json({
        success: true,
        data: { valid: isValid }
      });

    } catch (error: any) {
      console.error('Validate API key error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al validar la API key',
        error: error.message
      });
    }
  }

  /**
   * Obtener información de uso de OpenAI
   * GET /api/assistants/usage
   */
  public async getUsageInfo(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Obtener el asistente
      const assistant = await database.get(
        'SELECT * FROM assistants WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (!assistant) {
        return res.status(404).json({
          success: false,
          message: 'Asistente no encontrado'
        });
      }

      if (!assistant.openai_api_key) {
        return res.status(400).json({
          success: false,
          message: 'El asistente no tiene API key de OpenAI configurada'
        });
      }

      const usageInfo = await OpenAIService.getUsageInfo(assistant.openai_api_key);

      return res.json({
        success: true,
        data: usageInfo
      });

    } catch (error: any) {
      console.error('Get usage info error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener la información de uso',
        error: error.message
      });
    }
  }
}

export const assistantsController = new AssistantsController();
