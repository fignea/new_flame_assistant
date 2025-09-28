import { database } from '../config/database';
import { ResponseTemplate, TemplateCategory } from '../types';

export class TemplateService {
  /**
   * Crear una nueva plantilla de respuesta
   */
  static async createTemplate(
    template: Omit<ResponseTemplate, 'id' | 'created_at' | 'updated_at'>,
    userId: number
  ): Promise<ResponseTemplate> {
    try {
      // Verificar que el asistente pertenece al usuario
      if (template.assistant_id) {
        const assistant = await database.get(
          'SELECT id FROM assistants WHERE id = $1 AND user_id = $2',
          [template.assistant_id, userId]
        );

        if (!assistant) {
          throw new Error('Asistente no encontrado o no autorizado');
        }
      }

      await database.run(
        `INSERT INTO response_templates 
         (assistant_id, user_id, name, content, category, trigger_keywords, 
          is_active, priority, response_delay, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          template.assistant_id,
          userId,
          template.name,
          template.content,
          template.category || 'general',
          `{${(template.trigger_keywords || []).map(k => `"${k}"`).join(',')}}`,
          template.is_active !== undefined ? template.is_active : true,
          template.priority || 0,
          template.response_delay || 0
        ]
      );

      // Obtener la plantilla creada
      const result = await database.get(
        `SELECT * FROM response_templates 
         WHERE user_id = $1 AND name = $2 ORDER BY created_at DESC LIMIT 1`,
        [userId, template.name]
      );

      return {
        ...result,
        trigger_keywords: result.trigger_keywords || []
      };
    } catch (error) {
      console.error('Error creando plantilla:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las plantillas de un usuario
   */
  static async getUserTemplates(
    userId: number,
    assistantId?: number,
    category?: TemplateCategory
  ): Promise<ResponseTemplate[]> {
    try {
      let query = `
        SELECT * FROM response_templates 
        WHERE user_id = $1
      `;
      const params: any[] = [userId];

      if (assistantId) {
        query += ' AND assistant_id = $2';
        params.push(assistantId);
      }

      if (category) {
        const paramIndex = params.length + 1;
        query += ` AND category = $${paramIndex}`;
        params.push(category);
      }

      query += ' ORDER BY priority DESC, created_at DESC';

      const templates = await database.all(query, params);

      // Parsear trigger_keywords de JSON
      return templates.map(template => ({
        ...template,
        trigger_keywords: template.trigger_keywords || []
      }));
    } catch (error) {
      console.error('Error obteniendo plantillas del usuario:', error);
      throw error;
    }
  }

  /**
   * Obtener una plantilla por ID
   */
  static async getTemplateById(templateId: number, userId: number): Promise<ResponseTemplate | null> {
    try {
      const template = await database.get(
        'SELECT * FROM response_templates WHERE id = $1 AND user_id = $2',
        [templateId, userId]
      );

      if (!template) {
        return null;
      }

      return {
        ...template,
        trigger_keywords: template.trigger_keywords || []
      };
    } catch (error) {
      console.error('Error obteniendo plantilla por ID:', error);
      throw error;
    }
  }

  /**
   * Actualizar una plantilla
   */
  static async updateTemplate(
    templateId: number,
    updates: Partial<ResponseTemplate>,
    userId: number
  ): Promise<ResponseTemplate | null> {
    try {
      // Verificar que la plantilla pertenece al usuario
      const existingTemplate = await database.get(
        'SELECT id FROM response_templates WHERE id = $1 AND user_id = $2',
        [templateId, userId]
      );

      if (!existingTemplate) {
        throw new Error('Plantilla no encontrada o no autorizada');
      }

      // Construir query dinámicamente
      const fields = [];
      const values = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        fields.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }

      if (updates.content !== undefined) {
        fields.push(`content = $${paramIndex++}`);
        values.push(updates.content);
      }

      if (updates.category !== undefined) {
        fields.push(`category = $${paramIndex++}`);
        values.push(updates.category);
      }

      if (updates.trigger_keywords !== undefined) {
        fields.push(`trigger_keywords = $${paramIndex++}`);
        values.push(`{${updates.trigger_keywords.map(k => `"${k}"`).join(',')}}`);
      }

      if (updates.is_active !== undefined) {
        fields.push(`is_active = $${paramIndex++}`);
        values.push(updates.is_active);
      }

      if (updates.priority !== undefined) {
        fields.push(`priority = $${paramIndex++}`);
        values.push(updates.priority);
      }

      if (updates.response_delay !== undefined) {
        fields.push(`response_delay = $${paramIndex++}`);
        values.push(updates.response_delay);
      }

      if (fields.length === 0) {
        throw new Error('No hay campos para actualizar');
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(templateId);

      const query = `
        UPDATE response_templates 
        SET ${fields.join(', ')} 
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      values.push(userId);

      await database.run(query, values);

      // Obtener la plantilla actualizada
      const result = await database.get(
        `SELECT * FROM response_templates WHERE id = $1 AND user_id = $2`,
        [templateId, userId]
      );

      if (!result) {
        return null;
      }

      return {
        ...result,
        trigger_keywords: result.trigger_keywords || []
      };
    } catch (error) {
      console.error('Error actualizando plantilla:', error);
      throw error;
    }
  }

  /**
   * Eliminar una plantilla
   */
  static async deleteTemplate(templateId: number, userId: number): Promise<boolean> {
    try {
      const result = await database.run(
        'DELETE FROM response_templates WHERE id = $1 AND user_id = $2',
        [templateId, userId]
      );

      return result.changes > 0;
    } catch (error) {
      console.error('Error eliminando plantilla:', error);
      throw error;
    }
  }

  /**
   * Buscar plantillas por palabras clave
   */
  static async findTemplatesByKeywords(
    keywords: string[],
    userId: number,
    assistantId?: number
  ): Promise<ResponseTemplate[]> {
    try {
      let query = `
        SELECT * FROM response_templates 
        WHERE user_id = $1 
        AND is_active = true
        AND (
      `;

      const params: any[] = [userId];
      const conditions: string[] = [];

      keywords.forEach((keyword, index) => {
        const paramIndex = params.length + 1;
        conditions.push(`trigger_keywords::text ILIKE $${paramIndex}`);
        params.push(`%${keyword}%`);
      });

      query += conditions.join(' OR ') + ')';

      if (assistantId) {
        query += ' AND assistant_id = $' + (params.length + 1);
        params.push(assistantId);
      }

      query += ' ORDER BY priority DESC, created_at DESC';

      const templates = await database.all(query, params);

      return templates.map(template => ({
        ...template,
        trigger_keywords: template.trigger_keywords || []
      }));
    } catch (error) {
      console.error('Error buscando plantillas por palabras clave:', error);
      throw error;
    }
  }

  /**
   * Obtener plantillas por categoría
   */
  static async getTemplatesByCategory(
    category: TemplateCategory,
    userId: number,
    assistantId?: number
  ): Promise<ResponseTemplate[]> {
    try {
      let query = `
        SELECT * FROM response_templates 
        WHERE user_id = $1 
        AND category = $2
        AND is_active = true
      `;

      const params: any[] = [userId, category];

      if (assistantId) {
        query += ' AND assistant_id = $3';
        params.push(assistantId);
      }

      query += ' ORDER BY priority DESC, created_at DESC';

      const templates = await database.all(query, params);

      return templates.map(template => ({
        ...template,
        trigger_keywords: template.trigger_keywords || []
      }));
    } catch (error) {
      console.error('Error obteniendo plantillas por categoría:', error);
      throw error;
    }
  }

  /**
   * Duplicar una plantilla
   */
  static async duplicateTemplate(
    templateId: number,
    newName: string,
    userId: number
  ): Promise<ResponseTemplate | null> {
    try {
      const originalTemplate = await this.getTemplateById(templateId, userId);

      if (!originalTemplate) {
        return null;
      }

      const duplicatedTemplate = {
        ...originalTemplate,
        name: newName,
        id: undefined
      };

      return await this.createTemplate(duplicatedTemplate, userId);
    } catch (error) {
      console.error('Error duplicando plantilla:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de plantillas
   */
  static async getTemplateStats(userId: number): Promise<{
    total_templates: number;
    active_templates: number;
    templates_by_category: Record<string, number>;
  }> {
    try {
      const stats = await database.get(
        `SELECT 
           COUNT(*) as total_templates,
           COUNT(CASE WHEN is_active = true THEN 1 END) as active_templates
         FROM response_templates 
         WHERE user_id = $1`,
        [userId]
      );

      const categoryStats = await database.all(
        `SELECT category, COUNT(*) as count
         FROM response_templates 
         WHERE user_id = $1 AND is_active = true
         GROUP BY category`,
        [userId]
      );

      const templatesByCategory = categoryStats.reduce((acc, stat) => {
        acc[stat.category] = stat.count;
        return acc;
      }, {} as Record<string, number>);

      return {
        total_templates: stats.total_templates || 0,
        active_templates: stats.active_templates || 0,
        templates_by_category: templatesByCategory
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de plantillas:', error);
      throw error;
    }
  }
}
