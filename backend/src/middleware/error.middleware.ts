import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Middleware para manejar errores
export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let { statusCode = 500, message } = error;

  // Log del error
  logger.error('Error occurred:', {
    error: {
      message: error.message,
      stack: error.stack,
      statusCode
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.userId
    }
  });

  // Si es un error de validación de JWT
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token inválido';
  }

  // Si es un error de token expirado
  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expirado';
  }

  // Si es un error de validación
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Error de validación';
  }

  // Si es un error de base de datos
  if (error.name === 'DatabaseError') {
    statusCode = 500;
    message = 'Error interno del servidor';
  }

  // Si es un error de Redis
  if (error.name === 'RedisError') {
    statusCode = 503;
    message = 'Servicio temporalmente no disponible';
  }

  // En producción, no exponer detalles del error
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Error interno del servidor';
  }

  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.url,
      method: req.method
    }
  });
};

// Middleware para manejar rutas no encontradas
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new CustomError(`Ruta no encontrada: ${req.originalUrl}`, 404);
  return next(error);
};

// Middleware para manejar errores de sintaxis JSON
export const jsonErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({
      error: {
        message: 'JSON inválido',
        statusCode: 400,
        timestamp: new Date().toISOString()
      }
    });
  }
  return next(error);
};

// Middleware para manejar errores de multer (upload de archivos)
export const multerErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error.name === 'MulterError') {
    let message = 'Error al subir archivo';
    let statusCode = 400;

    switch (error.message) {
      case 'LIMIT_FILE_SIZE':
        message = 'El archivo es demasiado grande';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Demasiados archivos';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Campo de archivo inesperado';
        break;
      default:
        message = 'Error al procesar el archivo';
    }

    return res.status(statusCode).json({
      error: {
        message,
        statusCode,
        timestamp: new Date().toISOString()
      }
    });
  }
  return next(error);
};

// Función para crear errores personalizados
export const createError = (message: string, statusCode: number = 500): CustomError => {
  return new CustomError(message, statusCode);
};

// Función para manejar errores de base de datos
export const handleDatabaseError = (error: any): CustomError => {
  if (error.code === '23505') { // Unique violation
    return new CustomError('El recurso ya existe', 409);
  }
  if (error.code === '23503') { // Foreign key violation
    return new CustomError('Referencia inválida', 400);
  }
  if (error.code === '23502') { // Not null violation
    return new CustomError('Campo requerido faltante', 400);
  }
  if (error.code === '42P01') { // Undefined table
    return new CustomError('Tabla no encontrada', 500);
  }
  
  logger.error('Database error:', error);
  return new CustomError('Error de base de datos', 500);
};

// Función para manejar errores de Redis
export const handleRedisError = (error: any): CustomError => {
  logger.error('Redis error:', error);
  return new CustomError('Error de cache', 503);
};

// Función para manejar errores de validación
export const handleValidationError = (message: string): CustomError => {
  return new CustomError(message, 400);
};

// Función para manejar errores de autenticación
export const handleAuthError = (message: string = 'No autorizado'): CustomError => {
  return new CustomError(message, 401);
};

// Función para manejar errores de autorización
export const handleAuthorizationError = (message: string = 'Acceso denegado'): CustomError => {
  return new CustomError(message, 403);
};

// Función para manejar errores de recurso no encontrado
export const handleNotFoundError = (resource: string = 'Recurso'): CustomError => {
  return new CustomError(`${resource} no encontrado`, 404);
};
