import { Request, Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { whatsappService } from '../services/WhatsAppService';

export class WhatsAppController {
  public async getStatus(req: AuthenticatedRequest, res: Response<ApiResponse<any>>) {
    try {
      const stats = whatsappService.getStats();
      
      return res.json({
        success: true,
        data: {
          connected: stats.connectedSessions > 0,
          sessions: stats.connectedSessions,
          activeMonitors: stats.activeMonitors
        }
      });
    } catch (error) {
      console.error('WhatsApp status error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo estado de WhatsApp'
      });
    }
  }

  public async connect(req: AuthenticatedRequest, res: Response<ApiResponse<any>>) {
    try {
      const userId = parseInt(req.user?.id || '0');
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      await whatsappService.forceReconnect(userId);
      
      return res.json({
        success: true,
        data: { connected: true }
      });
    } catch (error) {
      console.error('WhatsApp connect error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error conectando WhatsApp'
      });
    }
  }

  public async disconnect(req: AuthenticatedRequest, res: Response<ApiResponse<any>>) {
    try {
      const userId = parseInt(req.user?.id || '0');
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      await whatsappService.disconnectSession(userId);
      
      return res.json({
        success: true,
        data: { disconnected: true }
      });
    } catch (error) {
      console.error('WhatsApp disconnect error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error desconectando WhatsApp'
      });
    }
  }

  public async getQR(req: AuthenticatedRequest, res: Response<ApiResponse<any>>) {
    try {
      // Implementación básica - QR no disponible en esta versión
      return res.json({
        success: true,
        data: { qr: null }
      });
    } catch (error) {
      console.error('WhatsApp QR error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo QR de WhatsApp'
      });
    }
  }

  public async sendMessage(req: AuthenticatedRequest, res: Response<ApiResponse<any>>) {
    try {
      const { to, message, type = 'text' } = req.body;
      
      if (!to || !message) {
        return res.status(400).json({
          success: false,
          message: 'Destinatario y mensaje son requeridos'
        });
      }

      const result = await whatsappService.sendMessage(to, message, type);
      
      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('WhatsApp send message error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error enviando mensaje'
      });
    }
  }

  public async getWebhooks(req: AuthenticatedRequest, res: Response<ApiResponse<any>>) {
    try {
      // Implementación básica - webhooks no implementados aún
      return res.json({
        success: true,
        data: {
          url: null,
          events: []
        }
      });
    } catch (error) {
      console.error('WhatsApp webhooks error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo webhooks'
      });
    }
  }

  public async setWebhooks(req: AuthenticatedRequest, res: Response<ApiResponse<any>>) {
    try {
      // Implementación básica - webhooks no implementados aún
      return res.json({
        success: true,
        data: {
          message: 'Webhooks no implementados aún'
        }
      });
    } catch (error) {
      console.error('WhatsApp set webhooks error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error configurando webhooks'
      });
    }
  }
}

export const whatsappController = new WhatsAppController();
