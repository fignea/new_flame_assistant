import { Request, Response } from 'express';
import { AutoResponseService } from '../services/AutoResponseService';
import { AuthenticatedRequest } from '../types';

export class AutoResponseController {
  /**
   * Procesar mensaje entrante y generar respuesta automática
   * POST /api/auto-response/process
   */
  static async processIncomingMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const { message } = req.body;
      const userId = req.user!.id;

      if (!message || !message.id || !message.chat_id || !message.content) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos en el mensaje'
        });
      }

      const result = await AutoResponseService.processIncomingMessage(
        message,
        userId
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error procesando mensaje entrante:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Enviar respuesta automática
   * POST /api/auto-response/send
   */
  static async sendAutoResponse(req: AuthenticatedRequest, res: Response) {
    try {
      const { chat_id, response, assistant_id, template_id } = req.body;
      const userId = req.user!.id;

      if (!chat_id || !response) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos: chat_id, response'
        });
      }

      const success = await AutoResponseService.sendAutoResponse(
        chat_id,
        response,
        userId,
        assistant_id,
        template_id
      );

      if (!success) {
        return res.status(500).json({
          success: false,
          error: 'Error enviando respuesta automática'
        });
      }

      res.json({
        success: true,
        message: 'Respuesta automática enviada exitosamente'
      });
    } catch (error: any) {
      console.error('Error enviando respuesta automática:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Procesar mensaje web entrante
   * POST /api/auto-response/process-web
   */
  static async processWebMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const { conversation_id, message_content } = req.body;
      const userId = req.user!.id;

      if (!conversation_id || !message_content) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos: conversation_id, message_content'
        });
      }

      const result = await AutoResponseService.processWebMessage(
        conversation_id,
        message_content,
        userId
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error procesando mensaje web:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Verificar si un asistente debe responder automáticamente
   * GET /api/auto-response/should-respond/:conversationId/:platform
   */
  static async shouldAutoRespond(req: AuthenticatedRequest, res: Response) {
    try {
      const { conversationId, platform } = req.params;
      const userId = req.user!.id;

      const shouldRespond = await AutoResponseService.shouldAutoRespond(
        conversationId,
        platform,
        userId
      );

      res.json({
        success: true,
        data: { should_respond: shouldRespond }
      });
    } catch (error: any) {
      console.error('Error verificando auto-respuesta:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener estadísticas de respuestas automáticas
   * GET /api/auto-response/stats
   */
  static async getAutoResponseStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const stats = await AutoResponseService.getAutoResponseStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error obteniendo estadísticas de respuestas automáticas:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor'
      });
    }
  }
}
