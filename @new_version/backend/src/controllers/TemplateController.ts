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

      const template = await TemplateService.createTemplate(templateData, userId);

      res.status(201).json({
        success: true,
        data: template,
        message: 'Plantilla creada exitosamente'
      });
    } catch (error: any) {
      console.error('Error creando plantilla:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener todas las plantillas del usuario
   * GET /api/templates
   */
  static async getUserTemplates(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { assistant_id, category } = req.query;

      const templates = await TemplateService.getUserTemplates(
        userId,
        assistant_id ? parseInt(assistant_id as string) : undefined,
        category as any
      );

      res.json({
        success: true,
        data: templates
      });
    } catch (error: any) {
      console.error('Error obteniendo plantillas del usuario:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener una plantilla por ID
   * GET /api/templates/:id
   */
  static async getTemplateById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const template = await TemplateService.getTemplateById(
        parseInt(id),
        userId
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
    } catch (error: any) {
      console.error('Error obteniendo plantilla por ID:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar una plantilla
   * PUT /api/templates/:id
   */
  static async updateTemplate(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const updates = req.body;

      const template = await TemplateService.updateTemplate(
        parseInt(id),
        updates,
        userId
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
    } catch (error: any) {
      console.error('Error actualizando plantilla:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Eliminar una plantilla
   * DELETE /api/templates/:id
   */
  static async deleteTemplate(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const success = await TemplateService.deleteTemplate(
        parseInt(id),
        userId
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
    } catch (error: any) {
      console.error('Error eliminando plantilla:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Buscar plantillas por palabras clave
   * POST /api/templates/search
   */
  static async searchTemplatesByKeywords(req: AuthenticatedRequest, res: Response) {
    try {
      const { keywords, assistant_id } = req.body;
      const userId = req.user!.id;

      if (!keywords || !Array.isArray(keywords)) {
        return res.status(400).json({
          success: false,
          error: 'keywords debe ser un array de strings'
        });
      }

      const templates = await TemplateService.findTemplatesByKeywords(
        keywords,
        userId,
        assistant_id
      );

      res.json({
        success: true,
        data: templates
      });
    } catch (error: any) {
      console.error('Error buscando plantillas por palabras clave:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
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
      const { assistant_id } = req.query;
      const userId = req.user!.id;

      const templates = await TemplateService.getTemplatesByCategory(
        category as any,
        userId,
        assistant_id ? parseInt(assistant_id as string) : undefined
      );

      res.json({
        success: true,
        data: templates
      });
    } catch (error: any) {
      console.error('Error obteniendo plantillas por categoría:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Duplicar una plantilla
   * POST /api/templates/:id/duplicate
   */
  static async duplicateTemplate(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { new_name } = req.body;
      const userId = req.user!.id;

      if (!new_name) {
        return res.status(400).json({
          success: false,
          error: 'Falta el campo requerido: new_name'
        });
      }

      const template = await TemplateService.duplicateTemplate(
        parseInt(id),
        new_name,
        userId
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
    } catch (error: any) {
      console.error('Error duplicando plantilla:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
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
      const stats = await TemplateService.getTemplateStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error obteniendo estadísticas de plantillas:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }
}
