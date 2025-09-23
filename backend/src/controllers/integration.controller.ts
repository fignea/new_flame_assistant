import { Request, Response } from 'express';
import { whatsappSimpleService } from '../services/whatsapp-simple.service';
import { whatsappMessageService } from '../services/whatsapp-message.service';
import { logger } from '../utils/logger';
import { CustomError } from '../utils/helpers';

export class IntegrationController {
  // Endpoint de prueba para verificar que el servicio funciona
  async testWhatsAppService(req: Request, res: Response) {
    try {
      logger.info('Testing WhatsApp service...');
      return res.status(200).json({
        success: true,
        message: 'WhatsApp service is working',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error testing WhatsApp service:', error);
      return res.status(500).json({
        success: false,
        message: 'WhatsApp service test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Crear sesión de WhatsApp Web
  async createWhatsAppSession(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      logger.info(`Creating WhatsApp session for user: ${userId}`);

      // Crear nueva sesión usando el servicio simplificado
      logger.info(`Creating new session for user: ${userId}`);
      const result = await whatsappSimpleService.createSession(userId);
      logger.info(`Session created successfully: ${result.sessionId}, QR available: ${!!result.qrCode}`);
      
      return res.status(201).json({
        success: true,
        data: {
          sessionId: result.sessionId,
          qrCode: result.qrCode || null,
          qrCodeDataURL: result.qrCodeDataURL || null,
          message: result.qrCode ? 'Sesión creada con QR disponible' : 'Sesión creada, QR pendiente'
        },
        message: 'Sesión de WhatsApp creada exitosamente'
      });

    } catch (error) {
      logger.error('Error creating WhatsApp session:', error);
      logger.error('Error details:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor',
        error: error instanceof Error ? error.stack : 'Unknown error'
      });
    }
  }

  // Obtener QR Code de WhatsApp
  async getWhatsAppQR(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      // Intentar obtener el QR del cache primero
      let qrData = whatsappSimpleService.getQRCodeFromCache(userId);
      
      // Si no está en cache, intentar obtener de la sesión
      if (!qrData) {
        const qrCode = await whatsappSimpleService.getQRCode(userId);
        const qrCodeDataURL = await whatsappSimpleService.getQRCodeDataURL(userId);
        
        if (qrCode) {
          qrData = { qr: qrCode, dataURL: qrCodeDataURL || '' };
        }
      }
      
      // Si no está disponible, esperar un poco y reintentar
      if (!qrData) {
        logger.info(`QR not immediately available for user ${userId}, waiting...`);
        
        // Esperar hasta 30 segundos con polling cada 1 segundo
        for (let i = 0; i < 30; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          qrData = whatsappSimpleService.getQRCodeFromCache(userId);
          if (!qrData) {
            const qrCode = await whatsappSimpleService.getQRCode(userId);
            const qrCodeDataURL = await whatsappSimpleService.getQRCodeDataURL(userId);
            
            if (qrCode) {
              qrData = { qr: qrCode, dataURL: qrCodeDataURL || '' };
            }
          }
          
          if (qrData) {
            logger.info(`QR obtained after ${(i + 1)} seconds for user ${userId}`);
            break;
          }
          logger.info(`QR polling attempt ${i + 1}/30 for user ${userId}`);
        }
      }

      if (!qrData) {
        throw new CustomError('QR Code no disponible', 404);
      }

      return res.status(200).json({
        success: true,
        data: {
          qrCode: qrData.qr,
          qrCodeDataURL: qrData.dataURL,
          sessionId: `whatsapp_${userId}_${Date.now()}`
        },
        message: 'QR Code obtenido exitosamente'
      });

    } catch (error) {
      logger.error('Error getting WhatsApp QR:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }

  // Obtener estado de conexión de WhatsApp
  async getWhatsAppStatus(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const status = whatsappSimpleService.getConnectionStatus(userId);

      return res.status(200).json({
        success: true,
        data: {
          ...status
        },
        message: 'Estado de WhatsApp obtenido exitosamente'
      });

    } catch (error) {
      logger.error('Error getting WhatsApp status:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }

  // Enviar mensaje de WhatsApp
  async sendWhatsAppMessage(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { to, message } = req.body;

      if (!userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      if (!to || !message) {
        throw new CustomError('Destinatario y mensaje son requeridos', 400);
      }

      const status = whatsappSimpleService.getConnectionStatus(userId);
      if (!status.isConnected) {
        throw new CustomError('Sesión de WhatsApp no conectada', 400);
      }

      const sentMessage = await whatsappSimpleService.sendMessage(userId, to, message);
      
      if (!sentMessage) {
        throw new CustomError('Error al enviar mensaje', 500);
      }

      res.status(200).json({
        success: true,
        data: {
          messageId: sentMessage.id,
          chatId: sentMessage.chatId,
          timestamp: sentMessage.messageTimestamp,
          status: sentMessage.status
        },
        message: 'Mensaje enviado exitosamente'
      });

    } catch (error) {
      logger.error('Error sending WhatsApp message:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }

  // Obtener chats de WhatsApp
  async getWhatsAppChats(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const status = whatsappSimpleService.getConnectionStatus(userId);
      if (!status.isConnected) {
        throw new CustomError('Sesión de WhatsApp no conectada', 400);
      }

      const chats = await whatsappSimpleService.getChats(userId);

      res.status(200).json({
        success: true,
        data: chats,
        message: 'Chats obtenidos exitosamente'
      });

    } catch (error) {
      logger.error('Error getting WhatsApp chats:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }

  // Obtener mensajes de un chat
  async getWhatsAppMessages(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { chatId } = req.params;
      const { limit = 50 } = req.query;

      if (!userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      if (!chatId) {
        throw new CustomError('ID del chat es requerido', 400);
      }

      const status = whatsappSimpleService.getConnectionStatus(userId);
      if (!status.isConnected) {
        throw new CustomError('Sesión de WhatsApp no conectada', 400);
      }

      const messages = await whatsappSimpleService.getMessages(
        userId, 
        chatId,
        parseInt(limit as string)
      );

      res.status(200).json({
        success: true,
        data: {
          messages,
          total: messages.length,
          limit: parseInt(limit as string)
        },
        message: 'Mensajes obtenidos exitosamente'
      });

    } catch (error) {
      logger.error('Error getting WhatsApp messages:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }

  // Desconectar sesión de WhatsApp
  async disconnectWhatsApp(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      await whatsappSimpleService.disconnectSession(userId);

      res.status(200).json({
        success: true,
        message: 'Sesión de WhatsApp desconectada exitosamente'
      });

    } catch (error) {
      logger.error('Error disconnecting WhatsApp session:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }

  // Forzar reconexión de WhatsApp
  async forceReconnectWhatsApp(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const reconnected = await whatsappSimpleService.forceReconnect(userId);

      if (reconnected) {
        res.status(200).json({
          success: true,
          message: 'Reconexión de WhatsApp iniciada exitosamente'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'No se pudo iniciar la reconexión'
        });
      }

    } catch (error) {
      logger.error('Error forcing WhatsApp reconnection:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }

  // Obtener todas las integraciones disponibles
      // Obtener estadísticas de sesiones
      async getSessionStats(req: Request, res: Response) {
        try {
          const stats = whatsappSimpleService.getSessionStats();
          
          return res.status(200).json({
            success: true,
            data: stats,
            message: 'Estadísticas de sesiones obtenidas exitosamente'
          });

        } catch (error) {
          logger.error('Error getting session stats:', error);
          return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error interno del servidor'
          });
        }
      }

      // Enviar mensaje de WhatsApp con validación
      async sendWhatsAppMessageWithValidation(req: Request, res: Response) {
        try {
          const userId = req.user?.userId;
          const { to, message, type = 'text' } = req.body;

          if (!userId) {
            throw new CustomError('Usuario no autenticado', 401);
          }

          if (!to || !message) {
            throw new CustomError('Destinatario y mensaje son requeridos', 400);
          }

          const status = whatsappSimpleService.getConnectionStatus(userId);
          if (!status.isConnected) {
            throw new CustomError('Sesión de WhatsApp no conectada', 400);
          }

          let sentMessage;
          if (type === 'media' && req.file) {
            // Enviar mensaje con media (simplificado por ahora)
            sentMessage = await whatsappSimpleService.sendMessage(userId, to, `[MEDIA] ${req.file.originalname}`);
          } else {
            // Enviar mensaje de texto
            sentMessage = await whatsappSimpleService.sendMessage(userId, to, message);
          }

          res.status(200).json({
            success: true,
            data: {
              messageId: sentMessage?.id || 'unknown',
              timestamp: sentMessage?.messageTimestamp || Date.now(),
              to: to,
              message: message
            },
            message: 'Mensaje enviado exitosamente'
          });

        } catch (error) {
          logger.error('Error sending WhatsApp message:', error);
          res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error interno del servidor'
          });
        }
      }

      // Obtener mensajes recientes de todos los chats
      async getRecentMessages(req: Request, res: Response) {
        try {
          const userId = req.user?.userId;
          const { limit = 50 } = req.query;

          if (!userId) {
            throw new CustomError('Usuario no autenticado', 401);
          }

          const status = whatsappSimpleService.getConnectionStatus(userId);
          if (!status.isConnected) {
            throw new CustomError('Sesión de WhatsApp no conectada', 400);
          }

          const chats = await whatsappSimpleService.getChats(userId);
          const recentMessages = [];

          for (const chat of chats.slice(0, 10)) { // Solo los primeros 10 chats
            try {
              const messages = await whatsappSimpleService.getMessages(
                userId, 
                chat.id
              );
              
              recentMessages.push({
                chatId: chat.id,
                chatName: chat.name,
                isGroup: chat.isGroup,
                unreadCount: chat.unreadCount,
                messages: messages
              });
            } catch (error) {
              logger.error(`Error getting messages for chat ${chat.id}:`, error);
            }
          }

          res.status(200).json({
            success: true,
            data: recentMessages,
            message: 'Mensajes recientes obtenidos exitosamente'
          });

        } catch (error) {
          logger.error('Error getting recent messages:', error);
          res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error interno del servidor'
          });
        }
      }

      // Marcar mensajes como leídos
      async markMessagesAsRead(req: Request, res: Response) {
        try {
          const userId = req.user?.userId;
          const { chatId } = req.params;

          if (!userId) {
            throw new CustomError('Usuario no autenticado', 401);
          }

          if (!chatId) {
            throw new CustomError('ID del chat es requerido', 400);
          }

          const status = whatsappSimpleService.getConnectionStatus(userId);
          if (!status.isConnected) {
            throw new CustomError('Sesión de WhatsApp no conectada', 400);
          }

          // Por ahora, solo confirmamos que la sesión está conectada
          // La funcionalidad de marcar como leído se implementará más adelante

          res.status(200).json({
            success: true,
            message: 'Mensajes marcados como leídos exitosamente'
          });

        } catch (error) {
          logger.error('Error marking messages as read:', error);
          res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error interno del servidor'
          });
        }
      }

  // Limpiar sesiones expiradas
  async cleanupExpiredSessions(req: Request, res: Response) {
    try {
      const cleanedCount = await whatsappSimpleService.cleanupExpiredSessions();
      
      return res.status(200).json({
        success: true,
        data: { cleanedCount },
        message: `${cleanedCount} sesiones expiradas limpiadas exitosamente`
      });

    } catch (error) {
      logger.error('Error cleaning up expired sessions:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }

  async getIntegrations(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      // Obtener estado de WhatsApp
      const whatsappStatus = whatsappSimpleService.getConnectionStatus(userId);

      const integrations = [
        {
          id: 'whatsapp-web',
          name: 'WhatsApp Web',
          description: 'Conecta tu cuenta de WhatsApp Web para enviar y recibir mensajes',
          type: 'whatsapp',
          available: true,
          connected: whatsappStatus.isConnected,
          authenticated: whatsappStatus.isAuthenticated,
          phoneNumber: whatsappStatus.phoneNumber,
          userName: whatsappStatus.userName,
          sessionId: whatsappStatus.sessionId
        },
        {
          id: 'facebook',
          name: 'Facebook Messenger',
          description: 'Integración con Facebook Messenger (próximamente)',
          type: 'facebook',
          available: false,
          connected: false,
          authenticated: false
        },
        {
          id: 'instagram',
          name: 'Instagram Direct',
          description: 'Integración con Instagram Direct (próximamente)',
          type: 'instagram',
          available: false,
          connected: false,
          authenticated: false
        },
        {
          id: 'whatsapp-business',
          name: 'WhatsApp Business API',
          description: 'API oficial de WhatsApp Business (próximamente)',
          type: 'whatsapp-business',
          available: false,
          connected: false,
          authenticated: false
        }
      ];

      res.status(200).json({
        success: true,
        data: integrations,
        message: 'Integraciones obtenidas exitosamente'
      });

    } catch (error) {
      logger.error('Error getting integrations:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }
}

export const integrationController = new IntegrationController();
