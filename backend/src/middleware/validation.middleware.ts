import { Request, Response, NextFunction } from 'express';
import { validationResult, body } from 'express-validator';

export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors: errors.array()
    });
    return;
  }
  
  next();
};

// Validaciones para autenticación
export const validateRegister = [
  body('name').notEmpty().withMessage('El nombre es requerido'),
  body('email').isEmail().withMessage('El email debe ser válido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  validateRequest
];

export const validateLogin = [
  body('email').isEmail().withMessage('El email debe ser válido'),
  body('password').notEmpty().withMessage('La contraseña es requerida'),
  validateRequest
];

export const validateRefreshToken = [
  body('refreshToken').notEmpty().withMessage('El refresh token es requerido'),
  validateRequest
];

export const validateForgotPassword = [
  body('email').isEmail().withMessage('El email debe ser válido'),
  validateRequest
];

export const validateResetPassword = [
  body('token').notEmpty().withMessage('El token es requerido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  validateRequest
];

// Validaciones para asistentes
export const validateCreateAssistant = [
  body('name').notEmpty().withMessage('El nombre es requerido'),
  body('description').notEmpty().withMessage('La descripción es requerida'),
  validateRequest
];

export const validateUpdateAssistant = [
  body('name').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('description').optional().notEmpty().withMessage('La descripción no puede estar vacía'),
  validateRequest
];

export const validateUUID = (paramName: string) => [
  body(paramName).isUUID().withMessage(`El ${paramName} debe ser un UUID válido`),
  validateRequest
];

export const validatePagination = [
  body('page').optional().isInt({ min: 1 }).withMessage('La página debe ser un número mayor a 0'),
  body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('El límite debe ser un número entre 1 y 100'),
  validateRequest
];

// Validaciones para conversaciones
export const validateCreateConversation = [
  body('title').notEmpty().withMessage('El título es requerido'),
  body('assistantId').isUUID().withMessage('El ID del asistente debe ser un UUID válido'),
  validateRequest
];

export const validateUpdateConversation = [
  body('title').optional().notEmpty().withMessage('El título no puede estar vacío'),
  validateRequest
];

export const validateSendMessage = [
  body('content').notEmpty().withMessage('El contenido del mensaje es requerido'),
  body('conversationId').isUUID().withMessage('El ID de la conversación debe ser un UUID válido'),
  validateRequest
];