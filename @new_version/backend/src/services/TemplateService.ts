import { database } from '../config/database';
import { ResponseTemplate, TemplateCategory } from '../types';

export class TemplateService {
  /**
   * Crear una nueva plantilla de respuesta
   */
  static async createTemplate(
    template: Omit<ResponseTemplate, 'id' | 'created_at' | 'updated_at'>,
    tenantId: string
  ): Promise<ResponseTemplate> {
    try {
      // Verificar que el asistente pertenece al usuario
      if (template.assistant_id) {
        const assistant = await database.get(
          'SELECT id FROM assistants WHERE id = $1 AND tenant_id = $2',
          [template.assistant_id, tenantId]
        );

        if (!assistant) {
          throw new Error('Asistente no encontrado o no autorizado');
        }
      }

      await database.run(
        `INSERT INTO response_templates 
         (assistant_id, name, content, trigger_keywords, category, priority, response_delay,
          is_active, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          template.assistant_id,
          template.name,
          template.content,
          `{${(template.trigger_keywords || []).map(k => `"${k}"`).join(',')}}`,
          template.category || null,
          template.priority || 0,
          template.response_delay || 0,
          template.is_active !== undefined ? template.is_active : true
        ]
      );

      // Obtener la plantilla creada
      const result = await database.get(
        `SELECT rt.* FROM response_templates rt
         JOIN assistants a ON rt.assistant_id = a.id
         WHERE a.tenant_id = $1 AND rt.name = $2 ORDER BY rt.created_at DESC LIMIT 1`,
        [tenantId, template.name]
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
    tenantId: string,
    assistantId?: number,
    category?: TemplateCategory
  ): Promise<ResponseTemplate[]> {
    try {
      let query = `
        SELECT rt.* FROM response_templates rt
        WHERE rt.tenant_id = $1
      `;
      const params: any[] = [tenantId];

      if (assistantId) {
        query += ' AND rt.assistant_id = $2';
        params.push(assistantId);
      }

      if (category) {
        query += ' AND rt.category = $' + (params.length + 1);
        params.push(category);
      }

      query += ' ORDER BY rt.created_at DESC';

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
  static async getTemplateById(templateId: number, tenantId: string): Promise<ResponseTemplate | null> {
    try {
      const template = await database.get(
        `SELECT rt.* FROM response_templates rt
         JOIN assistants a ON rt.assistant_id = a.id
         WHERE rt.id = $1 AND a.tenant_id = $2`,
        [templateId, tenantId]
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
    tenantId: string
  ): Promise<ResponseTemplate | null> {
    try {
      // Verificar que la plantilla pertenece al usuario
      const existingTemplate = await database.get(
        `SELECT rt.id FROM response_templates rt
         JOIN assistants a ON rt.assistant_id = a.id
         WHERE rt.id = $1 AND a.tenant_id = $2`,
        [templateId, tenantId]
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

      if (updates.priority !== undefined) {
        fields.push(`priority = $${paramIndex++}`);
        values.push(updates.priority);
      }

      if (updates.response_delay !== undefined) {
        fields.push(`response_delay = $${paramIndex++}`);
        values.push(updates.response_delay);
      }

      if (updates.is_active !== undefined) {
        fields.push(`is_active = $${paramIndex++}`);
        values.push(updates.is_active);
      }

      if (fields.length === 0) {
        throw new Error('No hay campos para actualizar');
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(templateId);

      const query = `
        UPDATE response_templates 
        SET ${fields.join(', ')} 
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      await database.run(query, values);

      // Obtener la plantilla actualizada
      const result = await database.get(
        `SELECT rt.* FROM response_templates rt
         JOIN assistants a ON rt.assistant_id = a.id
         WHERE rt.id = $1 AND a.tenant_id = $2`,
        [templateId, tenantId]
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
  static async deleteTemplate(templateId: number, tenantId: string): Promise<boolean> {
    try {
      // Primero verificar que la plantilla pertenece al usuario
      const existingTemplate = await database.get(
        `SELECT rt.id FROM response_templates rt
         JOIN assistants a ON rt.assistant_id = a.id
         WHERE rt.id = $1 AND a.tenant_id = $2`,
        [templateId, tenantId]
      );

      if (!existingTemplate) {
        return false;
      }

      const result = await database.run(
        'DELETE FROM response_templates WHERE id = $1',
        [templateId]
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
    tenantId: string,
    assistantId?: number
  ): Promise<ResponseTemplate[]> {
    try {
      let query = `
        SELECT rt.* FROM response_templates rt
        JOIN assistants a ON rt.assistant_id = a.id
        WHERE a.tenant_id = $1 
        AND rt.is_active = true
        AND (
      `;

      const params: any[] = [tenantId];
      const conditions: string[] = [];

      keywords.forEach((keyword, index) => {
        const paramIndex = params.length + 1;
        conditions.push(`rt.trigger_keywords::text ILIKE $${paramIndex}`);
        params.push(`%${keyword}%`);
      });

      query += conditions.join(' OR ') + ')';

      if (assistantId) {
        query += ' AND rt.assistant_id = $' + (params.length + 1);
        params.push(assistantId);
      }

      query += ' ORDER BY rt.created_at DESC';

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
    tenantId: string,
    assistantId?: number
  ): Promise<ResponseTemplate[]> {
    try {
      let query = `
        SELECT rt.* FROM response_templates rt
        JOIN assistants a ON rt.assistant_id = a.id
        WHERE a.tenant_id = $1 
        AND rt.category = $2
        AND rt.is_active = true
      `;

      const params: any[] = [tenantId, category];

      if (assistantId) {
        query += ' AND rt.assistant_id = $3';
        params.push(assistantId);
      }

      query += ' ORDER BY rt.created_at DESC';

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
    tenantId: string
  ): Promise<ResponseTemplate | null> {
    try {
      const originalTemplate = await this.getTemplateById(templateId, tenantId);

      if (!originalTemplate) {
        return null;
      }

      const duplicatedTemplate = {
        ...originalTemplate,
        name: newName,
        id: undefined
      };

      return await this.createTemplate(duplicatedTemplate, tenantId);
    } catch (error) {
      console.error('Error duplicando plantilla:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de plantillas
   */
  static async getTemplateStats(tenantId: string): Promise<{
    total_templates: number;
    active_templates: number;
    templates_by_category: Record<string, number>;
  }> {
    try {
      const stats = await database.get(
        `SELECT 
           COUNT(*) as total_templates,
           COUNT(CASE WHEN rt.is_active = true THEN 1 END) as active_templates
         FROM response_templates rt
         JOIN assistants a ON rt.assistant_id = a.id
         WHERE a.tenant_id = $1`,
        [tenantId]
      );

      // Obtener estadísticas por categoría
      const categoryStats = await database.all(
        `SELECT rt.category, COUNT(*) as count
         FROM response_templates rt
         JOIN assistants a ON rt.assistant_id = a.id
         WHERE a.tenant_id = $1 AND rt.is_active = true AND rt.category IS NOT NULL
         GROUP BY rt.category`,
        [tenantId]
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
