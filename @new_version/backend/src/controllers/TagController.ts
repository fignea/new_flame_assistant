import { Request, Response } from 'express';
import { TagService } from '../services/TagService';
import { AuthenticatedRequest } from '../types';

export class TagController {
  /**
   * Crear una nueva etiqueta
   * POST /api/tags
   */
  static async createTag(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const tagData = req.body;

      if (!tagData.name) {
        return res.status(400).json({
          success: false,
          error: 'Falta el campo requerido: name'
        });
      }

      const tag = await TagService.createTag(tagData, userId);

      res.status(201).json({
        success: true,
        data: tag,
        message: 'Etiqueta creada exitosamente'
      });
    } catch (error: any) {
      console.error('Error creando etiqueta:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener todas las etiquetas del usuario
   * GET /api/tags
   */
  static async getUserTags(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { active_only = false } = req.query;

      const tags = await TagService.getUserTags(
        userId,
        active_only === 'true'
      );

      res.json({
        success: true,
        data: tags
      });
    } catch (error: any) {
      console.error('Error obteniendo etiquetas del usuario:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener una etiqueta por ID
   * GET /api/tags/:id
   */
  static async getTagById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const tag = await TagService.getTagById(parseInt(id), userId);

      if (!tag) {
        return res.status(404).json({
          success: false,
          error: 'Etiqueta no encontrada'
        });
      }

      res.json({
        success: true,
        data: tag
      });
    } catch (error: any) {
      console.error('Error obteniendo etiqueta por ID:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar una etiqueta
   * PUT /api/tags/:id
   */
  static async updateTag(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const updates = req.body;

      const tag = await TagService.updateTag(parseInt(id), updates, userId);

      if (!tag) {
        return res.status(404).json({
          success: false,
          error: 'Etiqueta no encontrada'
        });
      }

      res.json({
        success: true,
        data: tag,
        message: 'Etiqueta actualizada exitosamente'
      });
    } catch (error: any) {
      console.error('Error actualizando etiqueta:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Eliminar una etiqueta
   * DELETE /api/tags/:id
   */
  static async deleteTag(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const success = await TagService.deleteTag(parseInt(id), userId);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Etiqueta no encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Etiqueta eliminada exitosamente'
      });
    } catch (error: any) {
      console.error('Error eliminando etiqueta:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Asignar etiqueta a una conversación
   * POST /api/tags/:id/conversation
   */
  static async tagConversation(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { conversation_id, platform } = req.body;
      const userId = req.user!.id;

      if (!conversation_id || !platform) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos: conversation_id, platform'
        });
      }

      const conversationTag = await TagService.tagConversation(
        conversation_id,
        platform,
        parseInt(id),
        userId
      );

      res.status(201).json({
        success: true,
        data: conversationTag,
        message: 'Etiqueta asignada a la conversación exitosamente'
      });
    } catch (error: any) {
      console.error('Error etiquetando conversación:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Asignar etiqueta a un contacto
   * POST /api/tags/:id/contact
   */
  static async tagContact(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { contact_id } = req.body;
      const userId = req.user!.id;

      if (!contact_id) {
        return res.status(400).json({
          success: false,
          error: 'Falta el campo requerido: contact_id'
        });
      }

      const contactTag = await TagService.tagContact(
        contact_id,
        parseInt(id),
        userId
      );

      res.status(201).json({
        success: true,
        data: contactTag,
        message: 'Etiqueta asignada al contacto exitosamente'
      });
    } catch (error: any) {
      console.error('Error etiquetando contacto:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener etiquetas de una conversación
   * GET /api/tags/conversation/:conversationId/:platform
   */
  static async getConversationTags(req: AuthenticatedRequest, res: Response) {
    try {
      const { conversationId, platform } = req.params;
      const userId = req.user!.id;

      const tags = await TagService.getConversationTags(
        conversationId,
        platform,
        userId
      );

      res.json({
        success: true,
        data: tags
      });
    } catch (error: any) {
      console.error('Error obteniendo etiquetas de conversación:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener etiquetas de un contacto
   * GET /api/tags/contact/:contactId
   */
  static async getContactTags(req: AuthenticatedRequest, res: Response) {
    try {
      const { contactId } = req.params;
      const userId = req.user!.id;

      const tags = await TagService.getContactTags(parseInt(contactId), userId);

      res.json({
        success: true,
        data: tags
      });
    } catch (error: any) {
      console.error('Error obteniendo etiquetas de contacto:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Remover etiqueta de una conversación
   * DELETE /api/tags/:id/conversation/:conversationId/:platform
   */
  static async untagConversation(req: AuthenticatedRequest, res: Response) {
    try {
      const { id, conversationId, platform } = req.params;
      const userId = req.user!.id;

      const success = await TagService.untagConversation(
        conversationId,
        platform,
        parseInt(id),
        userId
      );

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'No se encontró la relación etiqueta-conversación'
        });
      }

      res.json({
        success: true,
        message: 'Etiqueta removida de la conversación exitosamente'
      });
    } catch (error: any) {
      console.error('Error removiendo etiqueta de conversación:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Remover etiqueta de un contacto
   * DELETE /api/tags/:id/contact/:contactId
   */
  static async untagContact(req: AuthenticatedRequest, res: Response) {
    try {
      const { id, contactId } = req.params;
      const userId = req.user!.id;

      const success = await TagService.untagContact(
        parseInt(contactId),
        parseInt(id),
        userId
      );

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'No se encontró la relación etiqueta-contacto'
        });
      }

      res.json({
        success: true,
        message: 'Etiqueta removida del contacto exitosamente'
      });
    } catch (error: any) {
      console.error('Error removiendo etiqueta de contacto:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Buscar conversaciones por etiqueta
   * GET /api/tags/:id/conversations
   */
  static async getConversationsByTag(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { platform } = req.query;
      const userId = req.user!.id;

      const conversations = await TagService.getConversationsByTag(
        parseInt(id),
        userId,
        platform as string
      );

      res.json({
        success: true,
        data: conversations
      });
    } catch (error: any) {
      console.error('Error obteniendo conversaciones por etiqueta:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Buscar contactos por etiqueta
   * GET /api/tags/:id/contacts
   */
  static async getContactsByTag(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const contacts = await TagService.getContactsByTag(parseInt(id), userId);

      res.json({
        success: true,
        data: contacts
      });
    } catch (error: any) {
      console.error('Error obteniendo contactos por etiqueta:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener estadísticas de etiquetas
   * GET /api/tags/stats
   */
  static async getTagStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const stats = await TagService.getTagStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error obteniendo estadísticas de etiquetas:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }
}
