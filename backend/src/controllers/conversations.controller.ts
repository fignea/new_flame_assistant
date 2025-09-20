import { Request, Response, NextFunction } from 'express';
import { ConversationService } from '../services/conversation.service';
import { ConversationModel } from '../models/Conversation';
import { MessageModel } from '../models/Message';
import { AssistantModel } from '../models/Assistant';
import { pool } from '../config/database.config';
import { CustomError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

export class ConversationsController {
  private conversationService: ConversationService;

  constructor() {
    const conversationModel = new ConversationModel(pool);
    const messageModel = new MessageModel(pool);
    const assistantModel = new AssistantModel(pool);
    this.conversationService = new ConversationService(conversationModel, messageModel, assistantModel);
  }

  createConversation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const conversation = await this.conversationService.createConversation(req.user.userId, req.body);
      
      res.status(201).json({
        success: true,
        message: 'Conversación creada exitosamente',
        data: conversation
      });
    } catch (error) {
      next(error);
    }
  };

  getConversations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const filters = {
        status: req.query.status as string,
        platform: req.query.platform as string,
        priority: req.query.priority as string,
        assigned_assistant_id: req.query.assigned_assistant_id as string,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10
      };

      const result = await this.conversationService.getConversations(req.user.userId, filters);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  getConversationById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const { id } = req.params;
      const conversation = await this.conversationService.getConversationById(req.user.userId, id);
      
      res.json({
        success: true,
        data: conversation
      });
    } catch (error) {
      next(error);
    }
  };

  updateConversation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const { id } = req.params;
      const conversation = await this.conversationService.updateConversation(req.user.userId, id, req.body);
      
      res.json({
        success: true,
        message: 'Conversación actualizada exitosamente',
        data: conversation
      });
    } catch (error) {
      next(error);
    }
  };

  deleteConversation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const { id } = req.params;
      const result = await this.conversationService.deleteConversation(req.user.userId, id);
      
      res.json({
        success: true,
        message: 'Conversación eliminada exitosamente',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  getMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const { id } = req.params;
      const filters = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        sender: req.query.sender as string,
        type: req.query.type as string
      };

      const result = await this.conversationService.getMessages(req.user.userId, id, filters);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  sendMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const { id } = req.params;
      const message = await this.conversationService.sendMessage(req.user.userId, id, req.body);
      
      res.status(201).json({
        success: true,
        message: 'Mensaje enviado exitosamente',
        data: message
      });
    } catch (error) {
      next(error);
    }
  };

  markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const { id } = req.params;
      const result = await this.conversationService.markAsRead(req.user.userId, id);
      
      res.json({
        success: true,
        message: 'Conversación marcada como leída',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const result = await this.conversationService.getUnreadCount(req.user.userId);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  getConversationStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const { id } = req.params;
      const result = await this.conversationService.getConversationStats(req.user.userId, id);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  searchConversations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const { q } = req.query;
      if (!q) {
        throw new CustomError('Query de búsqueda requerido', 400);
      }

      const filters = {
        status: req.query.status as string,
        platform: req.query.platform as string,
        priority: req.query.priority as string,
        assigned_assistant_id: req.query.assigned_assistant_id as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10
      };

      const result = await this.conversationService.searchConversations(req.user.userId, q as string, filters);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  bulkUpdateConversations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const { conversationIds, ...updateData } = req.body;
      
      if (!conversationIds || !Array.isArray(conversationIds)) {
        throw new CustomError('Lista de IDs de conversaciones requerida', 400);
      }

      const result = await this.conversationService.bulkUpdateConversations(req.user.userId, conversationIds, updateData);
      
      res.json({
        success: true,
        message: 'Actualización masiva completada',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
}
