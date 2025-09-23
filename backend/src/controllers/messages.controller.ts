import { Request, Response } from 'express';
import { whatsappMessageService } from '../services/whatsapp-message.service';
import { logger } from '../utils/logger';
import { CustomError } from '../utils/helpers';

export class MessagesController {
  // Enviar mensaje de texto
  async sendMessage(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { to, message, type = 'text' } = req.body;

      if (!userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      if (!to || !message) {
        throw new CustomError('Destinatario y mensaje son requeridos', 400);
      }

      const status = whatsappMessageService.getConnectionStatus(userId);
      if (!status.isConnected) {
        throw new CustomError('Sesión de WhatsApp no conectada', 400);
      }

      const sentMessage = await whatsappMessageService.sendMessage(userId, to, message);
      
      if (!sentMessage) {
        throw new CustomError('Error al enviar mensaje', 500);
      }

      res.status(200).json({
        success: true,
        data: {
          messageId: sentMessage.id,
          chatId: sentMessage.chatId,
          timestamp: sentMessage.messageTimestamp,
          status: sentMessage.status,
          to: to,
          message: message
        },
        message: 'Mensaje enviado exitosamente'
      });

    } catch (error) {
      logger.error('Error sending message:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }

  // Enviar mensaje con media
  async sendMediaMessage(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { to, caption, mediaType } = req.body;
      const file = req.file;

      if (!userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      if (!to || !file) {
        throw new CustomError('Destinatario y archivo son requeridos', 400);
      }

      const status = whatsappMessageService.getConnectionStatus(userId);
      if (!status.isConnected) {
        throw new CustomError('Sesión de WhatsApp no conectada', 400);
      }

      // Preparar media para Baileys
      const media = {
        url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
        mimetype: file.mimetype,
        filename: file.originalname
      };

      const sentMessage = await whatsappMessageService.sendMediaMessage(userId, to, media, caption);
      
      if (!sentMessage) {
        throw new CustomError('Error al enviar mensaje con media', 500);
      }

      res.status(200).json({
        success: true,
        data: {
          messageId: sentMessage.id,
          chatId: sentMessage.chatId,
          timestamp: sentMessage.messageTimestamp,
          status: sentMessage.status,
          to: to,
          caption: caption,
          mediaType: sentMessage.type
        },
        message: 'Mensaje con media enviado exitosamente'
      });

    } catch (error) {
      logger.error('Error sending media message:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }

  // Obtener todos los chats
  async getChats(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const status = whatsappMessageService.getConnectionStatus(userId);
      if (!status.isConnected) {
        throw new CustomError('Sesión de WhatsApp no conectada', 400);
      }

      const chats = await whatsappMessageService.getChats(userId);

      res.status(200).json({
        success: true,
        data: chats,
        message: 'Chats obtenidos exitosamente'
      });

    } catch (error) {
      logger.error('Error getting chats:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }

  // Obtener mensajes de un chat específico
  async getMessages(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { chatId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      if (!userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      if (!chatId) {
        throw new CustomError('ID del chat es requerido', 400);
      }

      const status = whatsappMessageService.getConnectionStatus(userId);
      if (!status.isConnected) {
        throw new CustomError('Sesión de WhatsApp no conectada', 400);
      }

      const messages = await whatsappMessageService.getMessages(
        userId, 
        chatId,
        parseInt(limit as string)
      );

      // Aplicar paginación
      const startIndex = parseInt(offset as string) || 0;
      const endIndex = startIndex + parseInt(limit as string);
      const paginatedMessages = messages.slice(startIndex, endIndex);

      res.status(200).json({
        success: true,
        data: {
          messages: paginatedMessages,
          total: messages.length,
          limit: parseInt(limit as string),
          offset: startIndex,
          hasMore: endIndex < messages.length
        },
        message: 'Mensajes obtenidos exitosamente'
      });

    } catch (error) {
      logger.error('Error getting messages:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }

  // Marcar mensajes como leídos
  async markAsRead(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { chatId } = req.params;
      const { messageIds } = req.body;

      if (!userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      if (!chatId) {
        throw new CustomError('ID del chat es requerido', 400);
      }

      const status = whatsappMessageService.getConnectionStatus(userId);
      if (!status.isConnected) {
        throw new CustomError('Sesión de WhatsApp no conectada', 400);
      }

      const success = await whatsappMessageService.markAsRead(userId, chatId, messageIds);
      
      if (!success) {
        throw new CustomError('Error al marcar mensajes como leídos', 500);
      }

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

  // Obtener mensajes recientes de todos los chats
  async getRecentMessages(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { limit = 20 } = req.query;

      if (!userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const status = whatsappMessageService.getConnectionStatus(userId);
      if (!status.isConnected) {
        throw new CustomError('Sesión de WhatsApp no conectada', 400);
      }

      const chats = await whatsappMessageService.getChats(userId);
      const recentMessages = [];

      for (const chat of chats.slice(0, 10)) { // Solo los primeros 10 chats
        try {
          const messages = await whatsappMessageService.getMessages(
            userId, 
            chat.id,
            parseInt(limit as string)
          );
          
          recentMessages.push({
            chatId: chat.id,
            chatName: chat.name,
            isGroup: chat.isGroup,
            unreadCount: chat.unreadCount,
            lastMessage: chat.lastMessage,
            messages: messages.slice(0, 5) // Solo los últimos 5 mensajes por chat
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

  // Buscar mensajes
  async searchMessages(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { query, chatId, limit = 50 } = req.query;

      if (!userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      if (!query) {
        throw new CustomError('Término de búsqueda es requerido', 400);
      }

      const status = whatsappMessageService.getConnectionStatus(userId);
      if (!status.isConnected) {
        throw new CustomError('Sesión de WhatsApp no conectada', 400);
      }

      let chats = [];
      if (chatId) {
        chats = [{ id: chatId as string }];
      } else {
        chats = await whatsappMessageService.getChats(userId);
      }

      const searchResults = [];
      const searchTerm = (query as string).toLowerCase();

      for (const chat of chats) {
        try {
          const messages = await whatsappMessageService.getMessages(
            userId, 
            chat.id,
            100 // Buscar en los últimos 100 mensajes por chat
          );
          
          const matchingMessages = messages.filter(msg => 
            msg.body?.toLowerCase().includes(searchTerm) ||
            msg.senderName?.toLowerCase().includes(searchTerm)
          );

          if (matchingMessages.length > 0) {
            searchResults.push({
              chatId: chat.id,
              chatName: (chat as any).name || 'Chat sin nombre',
              isGroup: (chat as any).isGroup,
              messages: matchingMessages.slice(0, parseInt(limit as string))
            });
          }
        } catch (error) {
          logger.error(`Error searching messages in chat ${chat.id}:`, error);
        }
      }

      res.status(200).json({
        success: true,
        data: {
          results: searchResults,
          totalResults: searchResults.reduce((sum, chat) => sum + chat.messages.length, 0),
          searchTerm: query
        },
        message: 'Búsqueda completada exitosamente'
      });

    } catch (error) {
      logger.error('Error searching messages:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }

  // Obtener estadísticas de mensajes
  async getMessageStats(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const status = whatsappMessageService.getConnectionStatus(userId);
      if (!status.isConnected) {
        throw new CustomError('Sesión de WhatsApp no conectada', 400);
      }

      const stats = whatsappMessageService.getStats();
      const chats = await whatsappMessageService.getChats(userId);

      // Calcular estadísticas adicionales
      const totalUnreadMessages = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);
      const groupChats = chats.filter(chat => chat.isGroup).length;
      const individualChats = chats.filter(chat => !chat.isGroup).length;

      res.status(200).json({
        success: true,
        data: {
          ...stats,
          totalUnreadMessages,
          groupChats,
          individualChats,
          totalChats: chats.length
        },
        message: 'Estadísticas obtenidas exitosamente'
      });

    } catch (error) {
      logger.error('Error getting message stats:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }

  // Configurar webhook para mensajes entrantes
  async setupMessageWebhook(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { webhookUrl, events = ['message', 'messageUpdate'] } = req.body;

      if (!userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      if (!webhookUrl) {
        throw new CustomError('URL del webhook es requerida', 400);
      }

      // Registrar handler para webhook
      whatsappMessageService.onMessage(userId, async (message) => {
        try {
          // Enviar mensaje al webhook
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              event: 'message',
              userId,
              message,
              timestamp: new Date().toISOString()
            })
          });

          if (!response.ok) {
            logger.error(`Webhook failed for user ${userId}: ${response.status}`);
          }
        } catch (error) {
          logger.error(`Error sending webhook for user ${userId}:`, error);
        }
      });

      res.status(200).json({
        success: true,
        message: 'Webhook configurado exitosamente',
        data: {
          webhookUrl,
          events
        }
      });

    } catch (error) {
      logger.error('Error setting up webhook:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }
}

export const messagesController = new MessagesController();
