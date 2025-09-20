import { Request, Response, NextFunction } from 'express';
import { AssistantService } from '../services/assistant.service';
import { AssistantModel } from '../models/Assistant';
import { ScheduleModel } from '../models/Schedule';
import { pool } from '../config/database.config';
import { CustomError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

export class AssistantsController {
  private assistantService: AssistantService;

  constructor() {
    const assistantModel = new AssistantModel(pool);
    const scheduleModel = new ScheduleModel(pool);
    this.assistantService = new AssistantService(assistantModel, scheduleModel);
  }

  createAssistant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const assistant = await this.assistantService.createAssistant(req.user.userId, req.body);
      
      res.status(201).json({
        success: true,
        message: 'Asistente creado exitosamente',
        data: assistant
      });
    } catch (error) {
      next(error);
    }
  };

  getAssistants = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const filters = {
        status: req.query.status as string,
        type: req.query.type as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10
      };

      const result = await this.assistantService.getAssistants(req.user.userId, filters);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  getAssistantById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const { id } = req.params;
      const assistant = await this.assistantService.getAssistantById(req.user.userId, id);
      
      res.json({
        success: true,
        data: assistant
      });
    } catch (error) {
      next(error);
    }
  };

  updateAssistant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const { id } = req.params;
      const assistant = await this.assistantService.updateAssistant(req.user.userId, id, req.body);
      
      res.json({
        success: true,
        message: 'Asistente actualizado exitosamente',
        data: assistant
      });
    } catch (error) {
      next(error);
    }
  };

  deleteAssistant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const { id } = req.params;
      const result = await this.assistantService.deleteAssistant(req.user.userId, id);
      
      res.json({
        success: true,
        message: 'Asistente eliminado exitosamente',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  trainAssistant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const { id } = req.params;
      const result = await this.assistantService.trainAssistant(req.user.userId, id, req.body);
      
      res.json({
        success: true,
        message: 'Asistente entrenado exitosamente',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  getSchedules = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const { id } = req.params;
      const schedules = await this.assistantService.getSchedules(req.user.userId, id);
      
      res.json({
        success: true,
        data: schedules
      });
    } catch (error) {
      next(error);
    }
  };

  createSchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const { id } = req.params;
      const schedule = await this.assistantService.createSchedule(req.user.userId, id, req.body);
      
      res.status(201).json({
        success: true,
        message: 'Horario creado exitosamente',
        data: schedule
      });
    } catch (error) {
      next(error);
    }
  };

  updateSchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const { id, scheduleId } = req.params;
      const schedule = await this.assistantService.updateSchedule(req.user.userId, id, scheduleId, req.body);
      
      res.json({
        success: true,
        message: 'Horario actualizado exitosamente',
        data: schedule
      });
    } catch (error) {
      next(error);
    }
  };

  deleteSchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const { id, scheduleId } = req.params;
      const result = await this.assistantService.deleteSchedule(req.user.userId, id, scheduleId);
      
      res.json({
        success: true,
        message: 'Horario eliminado exitosamente',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  getAssistantStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        throw new CustomError('Usuario no autenticado', 401);
      }

      const { id } = req.params;
      const stats = await this.assistantService.getAssistantStats(req.user.userId, id);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  };

  searchAssistants = async (req: Request, res: Response, next: NextFunction) => {
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
        type: req.query.type as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10
      };

      const result = await this.assistantService.searchAssistants(req.user.userId, q as string, filters);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
}
