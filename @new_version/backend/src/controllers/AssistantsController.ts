import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse, CreateAssistantRequest, UpdateAssistantRequest, Assistant } from '../types';
import { database } from '../config/database';
import { OpenAIService } from '../services/OpenAIService';

export class AssistantsController {
  public async create(req: AuthenticatedRequest, res: Response<ApiResponse<Assistant>>) {
    try {
      const tenantId = req.user?.tenant_id;
      const assistantData: CreateAssistantRequest = req.body;
      
      if (!tenantId) {
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
      if (assistantData.api_key) {
        const isValidKey = await OpenAIService.validateApiKey(assistantData.api_key);
        if (!isValidKey) {
          return res.status(400).json({
            success: false,
            message: 'API key de OpenAI inválida'
          });
        }
      }

      // Encriptar API key si se proporciona
      let encryptedApiKey = null;
      if (assistantData.api_key) {
        // Aquí se debería usar una función de encriptación real
        encryptedApiKey = assistantData.api_key; // Por ahora sin encriptar
      }

      // Crear asistente
      const assistantId = await database.run(`
        INSERT INTO assistants (
          tenant_id, name, description, prompt, is_active, ai_provider, model,
          api_key_encrypted, max_tokens, temperature, auto_assign, response_delay,
          working_hours, business_hours, fallback_message, config, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
        RETURNING id
      `, [
        tenantId,
        assistantData.name,
        assistantData.description || null,
        assistantData.prompt || null,
        assistantData.is_active !== false,
        assistantData.ai_provider || 'openai',
        assistantData.model || 'gpt-3.5-turbo',
        encryptedApiKey,
        assistantData.max_tokens || 150,
        assistantData.temperature || 0.7,
        assistantData.auto_assign !== false,
        assistantData.response_delay || 0,
        JSON.stringify(assistantData.working_hours || {}),
        JSON.stringify(assistantData.business_hours || {}),
        assistantData.fallback_message || null,
        JSON.stringify(assistantData.config || {})
      ]);

      // Obtener asistente creado
      const assistant = await database.get(
        'SELECT * FROM assistants WHERE id = $1',
        [assistantId]
      ) as Assistant;

      return res.status(201).json({
        success: true,
        data: assistant,
        message: 'Asistente creado exitosamente'
      });

    } catch (error) {
      console.error('Create assistant error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

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
        'SELECT * FROM assistants WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
        [tenantId]
      ) as Assistant[];

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
      const tenantId = req.user?.tenant_id;
      const { id } = req.params;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const assistant = await database.get(
        'SELECT * FROM assistants WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
        [id, tenantId]
      ) as Assistant;

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

  public async update(req: AuthenticatedRequest, res: Response<ApiResponse<Assistant>>) {
    try {
      const tenantId = req.user?.tenant_id;
      const { id } = req.params;
      const updateData: UpdateAssistantRequest = req.body;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar que el asistente existe y pertenece al tenant
      const existingAssistant = await database.get(
        'SELECT id FROM assistants WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
        [id, tenantId]
      );

      if (!existingAssistant) {
        return res.status(404).json({
          success: false,
          message: 'Asistente no encontrado'
        });
      }

      // Validar API key si se proporciona
      if (updateData.api_key) {
        const isValidKey = await OpenAIService.validateApiKey(updateData.api_key);
        if (!isValidKey) {
          return res.status(400).json({
            success: false,
            message: 'API key de OpenAI inválida'
          });
        }
      }

      // Preparar campos para actualizar
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (updateData.name !== undefined) {
        updateFields.push(`name = $${paramCount++}`);
        updateValues.push(updateData.name);
      }

      if (updateData.description !== undefined) {
        updateFields.push(`description = $${paramCount++}`);
        updateValues.push(updateData.description);
      }

      if (updateData.prompt !== undefined) {
        updateFields.push(`prompt = $${paramCount++}`);
        updateValues.push(updateData.prompt);
      }

      if (updateData.is_active !== undefined) {
        updateFields.push(`is_active = $${paramCount++}`);
        updateValues.push(updateData.is_active);
      }

      if (updateData.ai_provider !== undefined) {
        updateFields.push(`ai_provider = $${paramCount++}`);
        updateValues.push(updateData.ai_provider);
      }

      if (updateData.model !== undefined) {
        updateFields.push(`model = $${paramCount++}`);
        updateValues.push(updateData.model);
      }

      if (updateData.api_key !== undefined) {
        updateFields.push(`api_key_encrypted = $${paramCount++}`);
        updateValues.push(updateData.api_key); // Por ahora sin encriptar
      }

      if (updateData.max_tokens !== undefined) {
        updateFields.push(`max_tokens = $${paramCount++}`);
        updateValues.push(updateData.max_tokens);
      }

      if (updateData.temperature !== undefined) {
        updateFields.push(`temperature = $${paramCount++}`);
        updateValues.push(updateData.temperature);
      }

      if (updateData.auto_assign !== undefined) {
        updateFields.push(`auto_assign = $${paramCount++}`);
        updateValues.push(updateData.auto_assign);
      }

      if (updateData.response_delay !== undefined) {
        updateFields.push(`response_delay = $${paramCount++}`);
        updateValues.push(updateData.response_delay);
      }

      if (updateData.working_hours !== undefined) {
        updateFields.push(`working_hours = $${paramCount++}`);
        updateValues.push(JSON.stringify(updateData.working_hours));
      }

      if (updateData.business_hours !== undefined) {
        updateFields.push(`business_hours = $${paramCount++}`);
        updateValues.push(JSON.stringify(updateData.business_hours));
      }

      if (updateData.fallback_message !== undefined) {
        updateFields.push(`fallback_message = $${paramCount++}`);
        updateValues.push(updateData.fallback_message);
      }

      if (updateData.config !== undefined) {
        updateFields.push(`config = $${paramCount++}`);
        updateValues.push(JSON.stringify(updateData.config));
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay campos para actualizar'
        });
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(id, tenantId);

      const query = `
        UPDATE assistants 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount++} AND tenant_id = $${paramCount++}
        RETURNING *
      `;

      const assistant = await database.get(query, updateValues) as Assistant;

      return res.json({
        success: true,
        data: assistant,
        message: 'Asistente actualizado exitosamente'
      });

    } catch (error) {
      console.error('Update assistant error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  public async delete(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const tenantId = req.user?.tenant_id;
      const { id } = req.params;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar que el asistente existe y pertenece al tenant
      const existingAssistant = await database.get(
        'SELECT id FROM assistants WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
        [id, tenantId]
      );

      if (!existingAssistant) {
        return res.status(404).json({
          success: false,
          message: 'Asistente no encontrado'
        });
      }

      // Soft delete
      await database.run(
        'UPDATE assistants SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      return res.json({
        success: true,
        message: 'Asistente eliminado exitosamente'
      });

    } catch (error) {
      console.error('Delete assistant error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  public async testAssistant(req: AuthenticatedRequest, res: Response<ApiResponse<{ response: string }>>) {
    try {
      const tenantId = req.user?.tenant_id;
      const { id } = req.params;
      const { message } = req.body;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      if (!message) {
        return res.status(400).json({
          success: false,
          message: 'Mensaje de prueba requerido'
        });
      }

      // Obtener asistente
      const assistant = await database.get(
        'SELECT * FROM assistants WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
        [id, tenantId]
      ) as Assistant;

      if (!assistant) {
        return res.status(404).json({
          success: false,
          message: 'Asistente no encontrado'
        });
      }

      if (!assistant.is_active) {
        return res.status(400).json({
          success: false,
          message: 'El asistente está inactivo'
        });
      }

      // Generar respuesta usando OpenAI
      const response = await OpenAIService.generateResponse(
        message,
        assistant.prompt || 'Eres un asistente virtual útil.',
        {
          model: assistant.model,
          max_tokens: assistant.max_tokens,
          temperature: assistant.temperature
        },
        assistant.api_key_encrypted || process.env.OPENAI_API_KEY
      );

      return res.json({
        success: true,
        data: { response }
      });

    } catch (error) {
      console.error('Test assistant error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error probando asistente'
      });
    }
  }

  public async getStats(req: AuthenticatedRequest, res: Response<ApiResponse<any>>) {
    try {
      const tenantId = req.user?.tenant_id;
      const { id } = req.params;
      
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar que el asistente existe
      const assistant = await database.get(
        'SELECT id FROM assistants WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
        [id, tenantId]
      );

      if (!assistant) {
        return res.status(404).json({
          success: false,
          message: 'Asistente no encontrado'
        });
      }

      // Obtener estadísticas del asistente
      const stats = await database.get(`
        SELECT 
          COUNT(DISTINCT c.id) as total_conversations,
          COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_conversations,
          COUNT(DISTINCT m.id) as total_messages,
          COUNT(DISTINCT CASE WHEN m.is_auto_response = true THEN m.id END) as auto_responses,
          AVG(c.resolution_time) as avg_response_time,
          AVG(c.satisfaction_score) as avg_satisfaction
        FROM conversations c
        LEFT JOIN messages m ON c.id = m.conversation_id
        WHERE c.assistant_id = $1 AND c.tenant_id = $2
      `, [id, tenantId]);

      return res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Assistant stats error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas del asistente'
      });
    }
  }
}

// Exportar instancia del controlador
export const assistantsController = new AssistantsController();