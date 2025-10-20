import { Request, Response } from 'express';
import { TemplateService } from '../services/TemplateService';
import { AuthenticatedRequest } from '../types';

export class TemplateController {
  /**
   * Crear una nueva plantilla de respuesta
   * POST /api/templates
   */
  static async createTemplate(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const templateData = req.body;

      if (!templateData.name || !templateData.content) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos: name, content'
        });
      }

      const template = await TemplateService.createTemplate(templateData, req.tenant?.id || '');

      res.status(201).json({
        success: true,
        data: template,
        message: 'Plantilla creada exitosamente'
      });
    } catch (error) {
      console.error('Error creating template:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener plantillas del usuario
   * GET /api/templates
   */
  static async getUserTemplates(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenant?.id;
      const { assistant_id, category, page = 1, limit = 20 } = req.query;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const offset = (Number(page) - 1) * Number(limit);

      const templates = await TemplateService.getUserTemplates(
        tenantId,
        assistant_id ? parseInt(assistant_id as string) : undefined,
        category as any || undefined
      );

      // Aplicar paginación manualmente
      const paginatedTemplates = templates.slice(offset, offset + Number(limit));
      const total = templates.length;

      res.json({
        success: true,
        data: paginatedTemplates,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error getting user templates:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        }
      });
    }
  }

  /**
   * Obtener plantilla por ID
   * GET /api/templates/:id
   */
  static async getTemplateById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const template = await TemplateService.getTemplateById(
        parseInt(id),
        req.tenant?.id || ''
      );

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Plantilla no encontrada'
        });
      }

      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      console.error('Error getting template by ID:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar plantilla
   * PUT /api/templates/:id
   */
  static async updateTemplate(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const updateData = req.body;

      const template = await TemplateService.updateTemplate(
        parseInt(id),
        updateData,
        req.tenant?.id || ''
      );

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Plantilla no encontrada'
        });
      }

      res.json({
        success: true,
        data: template,
        message: 'Plantilla actualizada exitosamente'
      });
    } catch (error) {
      console.error('Error updating template:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Eliminar plantilla
   * DELETE /api/templates/:id
   */
  static async deleteTemplate(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const success = await TemplateService.deleteTemplate(
        parseInt(id),
        req.tenant?.id || ''
      );

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Plantilla no encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Plantilla eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Buscar plantillas por palabras clave
   * POST /api/templates/search
   */
  static async searchTemplatesByKeywords(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { keywords } = req.body;

      if (!keywords || !Array.isArray(keywords)) {
        return res.status(400).json({
          success: false,
          error: 'Keywords es requerido y debe ser un array'
        });
      }

      const templates = await TemplateService.findTemplatesByKeywords(
        keywords,
        req.tenant?.id || ''
      );

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      console.error('Error searching templates:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener plantillas por categoría
   * GET /api/templates/category/:category
   */
  static async getTemplatesByCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const { category } = req.params;
      const userId = req.user!.id;

      const templates = await TemplateService.getTemplatesByCategory(
        category as any,
        req.tenant?.id || '',
        undefined
      );

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      console.error('Error getting templates by category:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Duplicar plantilla
   * POST /api/templates/:id/duplicate
   */
  static async duplicateTemplate(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const template = await TemplateService.duplicateTemplate(
        parseInt(id),
        `Copia de ${id}`,
        req.tenant?.id || ''
      );

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Plantilla no encontrada'
        });
      }

      res.status(201).json({
        success: true,
        data: template,
        message: 'Plantilla duplicada exitosamente'
      });
    } catch (error) {
      console.error('Error duplicating template:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener estadísticas de plantillas
   * GET /api/templates/stats
   */
  static async getTemplateStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const stats = await TemplateService.getTemplateStats(req.tenant?.id || '');

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting template stats:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
}