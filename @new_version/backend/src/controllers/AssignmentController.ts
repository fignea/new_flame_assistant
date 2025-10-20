import { Request, Response } from 'express';
import { AssignmentService } from '../services/AssignmentService';
import { AuthenticatedRequest } from '../types';

export class AssignmentController {
  /**
   * Asignar un asistente a una conversación
   * POST /api/assignments
   */
  static async assignAssistant(req: AuthenticatedRequest, res: Response) {
    try {
      const { assistant_id, conversation_id, platform } = req.body;
      const userId = req.user!.id;

      if (!assistant_id || !conversation_id || !platform) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos: assistant_id, conversation_id, platform'
        });
      }

      const assignment = await AssignmentService.assignAssistant(
        assistant_id,
        conversation_id,
        platform,
        userId
      );

      res.status(201).json({
        success: true,
        data: assignment,
        message: 'Asistente asignado exitosamente'
      });
    } catch (error: any) {
      console.error('Error asignando asistente:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener asistente asignado a una conversación
   * GET /api/assignments/conversation/:conversationId/:platform
   */
  static async getAssignedAssistant(req: AuthenticatedRequest, res: Response) {
    try {
      const { conversationId, platform } = req.params;
      const userId = req.user!.id;

      const assignment = await AssignmentService.getAssignedAssistant(
        conversationId,
        platform,
        userId
      );

      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: 'No hay asistente asignado a esta conversación'
        });
      }

      res.json({
        success: true,
        data: assignment
      });
    } catch (error: any) {
      console.error('Error obteniendo asistente asignado:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener todas las asignaciones del usuario
   * GET /api/assignments
   */
  static async getUserAssignments(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const assignments = await AssignmentService.getUserAssignments(userId);

      res.json({
        success: true,
        data: assignments
      });
    } catch (error: any) {
      console.error('Error obteniendo asignaciones del usuario:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Desasignar asistente de una conversación
   * DELETE /api/assignments/conversation/:conversationId/:platform
   */
  static async unassignAssistant(req: AuthenticatedRequest, res: Response) {
    try {
      const { conversationId, platform } = req.params;
      const userId = req.user!.id;

      const success = await AssignmentService.unassignAssistant(
        conversationId,
        platform,
        userId
      );

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'No se encontró asignación para desasignar'
        });
      }

      res.json({
        success: true,
        message: 'Asistente desasignado exitosamente'
      });
    } catch (error: any) {
      console.error('Error desasignando asistente:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Asignación automática de asistente
   * POST /api/assignments/auto-assign
   */
  static async autoAssignAssistant(req: AuthenticatedRequest, res: Response) {
    try {
      const { conversation_id, platform, contact_id } = req.body;
      const userId = req.user!.id;

      if (!conversation_id || !platform) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos: conversation_id, platform'
        });
      }

      const assignment = await AssignmentService.autoAssignAssistant(
        conversation_id,
        platform,
        userId,
        contact_id
      );

      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: 'No hay asistentes disponibles para asignación automática'
        });
      }

      res.status(201).json({
        success: true,
        data: assignment,
        message: 'Asistente asignado automáticamente'
      });
    } catch (error: any) {
      console.error('Error en asignación automática:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener estadísticas de asignaciones
   * GET /api/assignments/stats
   */
  static async getAssignmentStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const stats = await AssignmentService.getAssignmentStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error obteniendo estadísticas de asignaciones:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener conversaciones por asistente
   * GET /api/assignments/assistant/:assistantId
   */
  static async getConversationsByAssistant(req: AuthenticatedRequest, res: Response) {
    try {
      const { assistantId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      const userId = req.user!.id;

      const assignments = await AssignmentService.getConversationsByAssistant(
        assistantId,
        userId,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json({
        success: true,
        data: assignments
      });
    } catch (error: any) {
      console.error('Error obteniendo conversaciones por asistente:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Verificar si una conversación tiene asistente asignado
   * GET /api/assignments/check/:conversationId/:platform
   */
  static async hasAssignedAssistant(req: AuthenticatedRequest, res: Response) {
    try {
      const { conversationId, platform } = req.params;
      const userId = req.user!.id;

      const hasAssignment = await AssignmentService.hasAssignedAssistant(
        conversationId,
        platform,
        userId
      );

      res.json({
        success: true,
        data: { has_assignment: hasAssignment }
      });
    } catch (error: any) {
      console.error('Error verificando asignación:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }
}
