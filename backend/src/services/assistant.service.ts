import { AssistantModel } from '../models/Assistant';
import { ScheduleModel } from '../models/Schedule';
import { 
  CreateAssistantRequest, 
  UpdateAssistantRequest, 
  CreateScheduleRequest,
  UpdateScheduleRequest,
  TrainAssistantRequest 
} from '../types/assistant.types';
import { CustomError, handleDatabaseError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { paginate } from '../utils/helpers';

export class AssistantService {
  constructor(
    private assistantModel: AssistantModel,
    private scheduleModel: ScheduleModel
  ) {}

  async createAssistant(userId: string, data: CreateAssistantRequest) {
    try {
      const assistant = await this.assistantModel.create({
        user_id: userId,
        ...data
      });

      logger.info(`Assistant created: ${assistant.id} by user: ${userId}`);

      return assistant;
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  async getAssistants(userId: string, filters: any = {}) {
    try {
      const { assistants, total } = await this.assistantModel.getAll({
        user_id: userId,
        ...filters
      });
      
      const pagination = paginate(filters.page || 1, filters.limit || 10, total);

      return {
        assistants,
        pagination
      };
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  async getAssistantById(userId: string, assistantId: string) {
    try {
      const assistant = await this.assistantModel.findById(assistantId);
      
      if (!assistant) {
        throw new CustomError('Asistente no encontrado', 404);
      }

      if (assistant.user_id !== userId) {
        throw new CustomError('No autorizado para acceder a este asistente', 403);
      }

      return assistant;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw handleDatabaseError(error);
    }
  }

  async updateAssistant(userId: string, assistantId: string, data: UpdateAssistantRequest) {
    try {
      // Verificar que el asistente pertenece al usuario
      const assistant = await this.assistantModel.findById(assistantId);
      if (!assistant || assistant.user_id !== userId) {
        throw new CustomError('Asistente no encontrado o no autorizado', 404);
      }

      const updatedAssistant = await this.assistantModel.update(assistantId, data);

      logger.info(`Assistant updated: ${assistantId} by user: ${userId}`);

      return updatedAssistant;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw handleDatabaseError(error);
    }
  }

  async deleteAssistant(userId: string, assistantId: string) {
    try {
      // Verificar que el asistente pertenece al usuario
      const assistant = await this.assistantModel.findById(assistantId);
      if (!assistant || assistant.user_id !== userId) {
        throw new CustomError('Asistente no encontrado o no autorizado', 404);
      }

      // Eliminar horarios asociados
      await this.scheduleModel.deleteByAssistantId(assistantId);

      // Eliminar asistente
      const success = await this.assistantModel.delete(assistantId);

      if (!success) {
        throw new CustomError('Error al eliminar asistente', 500);
      }

      logger.info(`Assistant deleted: ${assistantId} by user: ${userId}`);

      return { success: true };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw handleDatabaseError(error);
    }
  }

  async trainAssistant(userId: string, assistantId: string, data: TrainAssistantRequest) {
    try {
      // Verificar que el asistente pertenece al usuario
      const assistant = await this.assistantModel.findById(assistantId);
      if (!assistant || assistant.user_id !== userId) {
        throw new CustomError('Asistente no encontrado o no autorizado', 404);
      }

      if (assistant.type !== 'ai') {
        throw new CustomError('Solo los asistentes de IA pueden ser entrenados', 400);
      }

      // Actualizar estado a training
      await this.assistantModel.update(assistantId, { status: 'training' });

      // TODO: Implementar lógica de entrenamiento con IA
      // Por ahora simulamos el entrenamiento
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Actualizar estado a active
      await this.assistantModel.update(assistantId, { status: 'active' });

      logger.info(`Assistant trained: ${assistantId} by user: ${userId}`);

      return { 
        success: true, 
        message: 'Asistente entrenado exitosamente',
        trainingData: data.training_data.length
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw handleDatabaseError(error);
    }
  }

  async getSchedules(userId: string, assistantId: string) {
    try {
      // Verificar que el asistente pertenece al usuario
      const assistant = await this.assistantModel.findById(assistantId);
      if (!assistant || assistant.user_id !== userId) {
        throw new CustomError('Asistente no encontrado o no autorizado', 404);
      }

      const schedules = await this.scheduleModel.findByAssistantId(assistantId);

      return schedules;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw handleDatabaseError(error);
    }
  }

  async createSchedule(userId: string, assistantId: string, data: CreateScheduleRequest) {
    try {
      // Verificar que el asistente pertenece al usuario
      const assistant = await this.assistantModel.findById(assistantId);
      if (!assistant || assistant.user_id !== userId) {
        throw new CustomError('Asistente no encontrado o no autorizado', 404);
      }

      // Validar horario
      if (data.start_time >= data.end_time) {
        throw new CustomError('La hora de inicio debe ser anterior a la hora de fin', 400);
      }

      const schedule = await this.scheduleModel.create({
        assistant_id: assistantId,
        ...data
      });

      logger.info(`Schedule created: ${schedule.id} for assistant: ${assistantId} by user: ${userId}`);

      return schedule;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw handleDatabaseError(error);
    }
  }

  async updateSchedule(userId: string, assistantId: string, scheduleId: string, data: UpdateScheduleRequest) {
    try {
      // Verificar que el asistente pertenece al usuario
      const assistant = await this.assistantModel.findById(assistantId);
      if (!assistant || assistant.user_id !== userId) {
        throw new CustomError('Asistente no encontrado o no autorizado', 404);
      }

      // Verificar que el horario pertenece al asistente
      const schedule = await this.scheduleModel.findById(scheduleId);
      if (!schedule || schedule.assistant_id !== assistantId) {
        throw new CustomError('Horario no encontrado', 404);
      }

      // Validar horario si se actualiza
      if (data.start_time && data.end_time && data.start_time >= data.end_time) {
        throw new CustomError('La hora de inicio debe ser anterior a la hora de fin', 400);
      }

      const updatedSchedule = await this.scheduleModel.update(scheduleId, data);

      logger.info(`Schedule updated: ${scheduleId} for assistant: ${assistantId} by user: ${userId}`);

      return updatedSchedule;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw handleDatabaseError(error);
    }
  }

  async deleteSchedule(userId: string, assistantId: string, scheduleId: string) {
    try {
      // Verificar que el asistente pertenece al usuario
      const assistant = await this.assistantModel.findById(assistantId);
      if (!assistant || assistant.user_id !== userId) {
        throw new CustomError('Asistente no encontrado o no autorizado', 404);
      }

      // Verificar que el horario pertenece al asistente
      const schedule = await this.scheduleModel.findById(scheduleId);
      if (!schedule || schedule.assistant_id !== assistantId) {
        throw new CustomError('Horario no encontrado', 404);
      }

      const success = await this.scheduleModel.delete(scheduleId);

      if (!success) {
        throw new CustomError('Error al eliminar horario', 500);
      }

      logger.info(`Schedule deleted: ${scheduleId} for assistant: ${assistantId} by user: ${userId}`);

      return { success: true };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw handleDatabaseError(error);
    }
  }

  async isAssistantActive(assistantId: string): Promise<boolean> {
    try {
      const assistant = await this.assistantModel.findById(assistantId);
      if (!assistant || assistant.status !== 'active') {
        return false;
      }

      // Verificar si está en horario activo
      const now = new Date();
      const dayOfWeek = now.getDay();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM

      return await this.scheduleModel.isAssistantActive(assistantId, dayOfWeek, currentTime);
    } catch (error) {
      logger.error('Error checking assistant activity:', error);
      return false;
    }
  }

  async getAssistantStats(userId: string, assistantId: string) {
    try {
      // Verificar que el asistente pertenece al usuario
      const assistant = await this.assistantModel.findById(assistantId);
      if (!assistant || assistant.user_id !== userId) {
        throw new CustomError('Asistente no encontrado o no autorizado', 404);
      }

      const schedules = await this.scheduleModel.getActiveSchedules(assistantId);
      const isActive = await this.isAssistantActive(assistantId);

      return {
        assistantId,
        name: assistant.name,
        type: assistant.type,
        status: assistant.status,
        isActive,
        schedulesCount: schedules.length,
        activeSchedules: schedules.filter(s => s.enabled).length,
        created_at: assistant.created_at,
        updated_at: assistant.updated_at
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw handleDatabaseError(error);
    }
  }

  async searchAssistants(userId: string, query: string, filters: any = {}) {
    try {
      const searchFilters = {
        ...filters,
        user_id: userId,
        search: query
      };

      const { assistants, total } = await this.assistantModel.getAll(searchFilters);
      
      const pagination = paginate(filters.page || 1, filters.limit || 10, total);

      return {
        assistants,
        pagination,
        query
      };
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }
}
