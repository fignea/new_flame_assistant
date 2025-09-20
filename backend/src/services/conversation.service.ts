import { ConversationModel } from '../models/Conversation';
import { MessageModel } from '../models/Message';
import { AssistantModel } from '../models/Assistant';
import { 
  CreateConversationRequest, 
  UpdateConversationRequest, 
  SendMessageRequest,
  ConversationFilters 
} from '../types/conversation.types';
import { CustomError, handleDatabaseError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { paginate } from '../utils/helpers';

export class ConversationService {
  constructor(
    private conversationModel: ConversationModel,
    private messageModel: MessageModel,
    private assistantModel: AssistantModel
  ) {}

  async createConversation(userId: string, data: CreateConversationRequest) {
    try {
      // Verificar que el asistente pertenece al usuario si se asigna
      if (data.assigned_assistant_id) {
        const assistant = await this.assistantModel.findById(data.assigned_assistant_id);
        if (!assistant || assistant.user_id !== userId) {
          throw new CustomError('Asistente no encontrado o no autorizado', 404);
        }
      }

      const conversation = await this.conversationModel.create({
        user_id: userId,
        ...data
      });

      logger.info(`Conversation created: ${conversation.id} for user: ${userId}`);

      return conversation;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw handleDatabaseError(error);
    }
  }

  async getConversations(userId: string, filters: ConversationFilters = {}) {
    try {
      const { conversations, total } = await this.conversationModel.findByUserId(userId, filters);
      
      const pagination = paginate(filters.page || 1, filters.limit || 10, total);

      return {
        conversations,
        pagination
      };
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  async getConversationById(userId: string, conversationId: string) {
    try {
      const conversation = await this.conversationModel.findById(conversationId);
      
      if (!conversation) {
        throw new CustomError('Conversación no encontrada', 404);
      }

      if (conversation.user_id !== userId) {
        throw new CustomError('No autorizado para acceder a esta conversación', 403);
      }

      return conversation;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw handleDatabaseError(error);
    }
  }

  async updateConversation(userId: string, conversationId: string, data: UpdateConversationRequest) {
    try {
      // Verificar que la conversación pertenece al usuario
      const conversation = await this.conversationModel.findById(conversationId);
      if (!conversation || conversation.user_id !== userId) {
        throw new CustomError('Conversación no encontrada o no autorizada', 404);
      }

      // Verificar que el asistente pertenece al usuario si se asigna
      if (data.assigned_assistant_id) {
        const assistant = await this.assistantModel.findById(data.assigned_assistant_id);
        if (!assistant || assistant.user_id !== userId) {
          throw new CustomError('Asistente no encontrado o no autorizado', 404);
        }
      }

      const updatedConversation = await this.conversationModel.update(conversationId, data);

      logger.info(`Conversation updated: ${conversationId} by user: ${userId}`);

      return updatedConversation;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw handleDatabaseError(error);
    }
  }

  async deleteConversation(userId: string, conversationId: string) {
    try {
      // Verificar que la conversación pertenece al usuario
      const conversation = await this.conversationModel.findById(conversationId);
      if (!conversation || conversation.user_id !== userId) {
        throw new CustomError('Conversación no encontrada o no autorizada', 404);
      }

      const success = await this.conversationModel.delete(conversationId);

      if (!success) {
        throw new CustomError('Error al eliminar conversación', 500);
      }

      logger.info(`Conversation deleted: ${conversationId} by user: ${userId}`);

      return { success: true };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw handleDatabaseError(error);
    }
  }

  async getMessages(userId: string, conversationId: string, filters: any = {}) {
    try {
      // Verificar que la conversación pertenece al usuario
      const conversation = await this.conversationModel.findById(conversationId);
      if (!conversation || conversation.user_id !== userId) {
        throw new CustomError('Conversación no encontrada o no autorizada', 404);
      }

      const { messages, total } = await this.messageModel.findByConversationId(conversationId, filters);
      
      const pagination = paginate(filters.page || 1, filters.limit || 50, total);

      return {
        messages,
        pagination
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw handleDatabaseError(error);
    }
  }

  async sendMessage(userId: string, conversationId: string, data: SendMessageRequest) {
    try {
      // Verificar que la conversación pertenece al usuario
      const conversation = await this.conversationModel.findById(conversationId);
      if (!conversation || conversation.user_id !== userId) {
        throw new CustomError('Conversación no encontrada o no autorizada', 404);
      }

      // Crear mensaje
      const message = await this.messageModel.create({
        conversation_id: conversationId,
        content: data.content,
        sender: 'user',
        type: data.type || 'text',
        metadata: data.metadata
      });

      // Actualizar conversación con último mensaje
      await this.conversationModel.update(conversationId, {
        last_message: data.content,
        last_message_time: new Date(),
        unread_count: conversation.assigned_assistant_id ? conversation.unread_count + 1 : 0
      });

      logger.info(`Message sent in conversation: ${conversationId} by user: ${userId}`);

      return message;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw handleDatabaseError(error);
    }
  }

  async markAsRead(userId: string, conversationId: string) {
    try {
      // Verificar que la conversación pertenece al usuario
      const conversation = await this.conversationModel.findById(conversationId);
      if (!conversation || conversation.user_id !== userId) {
        throw new CustomError('Conversación no encontrada o no autorizada', 404);
      }

      // Marcar mensajes como leídos
      await this.messageModel.markAsRead(conversationId, 'assistant');

      // Resetear contador de no leídos
      await this.conversationModel.resetUnreadCount(conversationId);

      logger.info(`Conversation marked as read: ${conversationId} by user: ${userId}`);

      return { success: true };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw handleDatabaseError(error);
    }
  }

  async getUnreadCount(userId: string) {
    try {
      const totalUnread = await this.conversationModel.getTotalUnreadCount(userId);
      return { unreadCount: totalUnread };
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  async getConversationStats(userId: string, conversationId: string) {
    try {
      // Verificar que la conversación pertenece al usuario
      const conversation = await this.conversationModel.findById(conversationId);
      if (!conversation || conversation.user_id !== userId) {
        throw new CustomError('Conversación no encontrada o no autorizada', 404);
      }

      const stats = await this.messageModel.getMessageStats(conversationId);

      return {
        conversationId,
        stats
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw handleDatabaseError(error);
    }
  }

  async searchConversations(userId: string, query: string, filters: ConversationFilters = {}) {
    try {
      const searchFilters = {
        ...filters,
        search: query
      };

      const { conversations, total } = await this.conversationModel.findByUserId(userId, searchFilters);
      
      const pagination = paginate(filters.page || 1, filters.limit || 10, total);

      return {
        conversations,
        pagination,
        query
      };
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  async bulkUpdateConversations(userId: string, conversationIds: string[], data: UpdateConversationRequest) {
    try {
      const results = [];

      for (const conversationId of conversationIds) {
        try {
          const result = await this.updateConversation(userId, conversationId, data);
          results.push({ id: conversationId, success: true, data: result });
        } catch (error) {
          results.push({ 
            id: conversationId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Error desconocido' 
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;

      logger.info(`Bulk update conversations: ${successCount} success, ${errorCount} errors by user: ${userId}`);

      return {
        results,
        summary: {
          total: conversationIds.length,
          success: successCount,
          errors: errorCount
        }
      };
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }
}
