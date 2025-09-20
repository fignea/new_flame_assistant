import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';

// Middleware para manejar errores de validación
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined
    }));

    return res.status(400).json({
      error: 'Error de validación',
      message: 'Los datos proporcionados no son válidos',
      details: formattedErrors
    });
  }
  
  return next();
};

// Validaciones para autenticación
export const validateRegister = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Debe ser un email válido'),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('La contraseña debe tener entre 8 y 128 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una letra minúscula, una mayúscula y un número'),
  handleValidationErrors
];

export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Debe ser un email válido'),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida'),
  handleValidationErrors
];

export const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('El refresh token es requerido'),
  handleValidationErrors
];

export const validateForgotPassword = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Debe ser un email válido'),
  handleValidationErrors
];

export const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('El token es requerido'),
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('La contraseña debe tener entre 8 y 128 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una letra minúscula, una mayúscula y un número'),
  handleValidationErrors
];

// Validaciones para conversaciones
export const validateCreateConversation = [
  body('contact_name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('El nombre del contacto es requerido y debe tener máximo 255 caracteres'),
  body('contact_phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('El teléfono debe ser válido'),
  body('contact_email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('El email debe ser válido'),
  body('platform')
    .isIn(['whatsapp', 'facebook', 'instagram', 'telegram'])
    .withMessage('La plataforma debe ser whatsapp, facebook, instagram o telegram'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('La prioridad debe ser low, medium, high o urgent'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Los tags deben ser un array'),
  handleValidationErrors
];

export const validateUpdateConversation = [
  body('status')
    .optional()
    .isIn(['active', 'pending', 'resolved', 'archived'])
    .withMessage('El estado debe ser active, pending, resolved o archived'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('La prioridad debe ser low, medium, high o urgent'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Los tags deben ser un array'),
  handleValidationErrors
];

export const validateSendMessage = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 4000 })
    .withMessage('El contenido del mensaje es requerido y debe tener máximo 4000 caracteres'),
  body('type')
    .optional()
    .isIn(['text', 'image', 'file', 'audio', 'video'])
    .withMessage('El tipo debe ser text, image, file, audio o video'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Los metadatos deben ser un objeto'),
  handleValidationErrors
];

// Validaciones para asistentes
export const validateCreateAssistant = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('El nombre del asistente es requerido y debe tener máximo 255 caracteres'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('La descripción debe tener máximo 1000 caracteres'),
  body('type')
    .isIn(['auto', 'ai'])
    .withMessage('El tipo debe ser auto o ai'),
  body('auto_response')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('La respuesta automática debe tener máximo 2000 caracteres'),
  body('ai_prompt')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('El prompt de IA debe tener máximo 2000 caracteres'),
  handleValidationErrors
];

export const validateUpdateAssistant = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('El nombre del asistente debe tener máximo 255 caracteres'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('La descripción debe tener máximo 1000 caracteres'),
  body('type')
    .optional()
    .isIn(['auto', 'ai'])
    .withMessage('El tipo debe ser auto o ai'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'training'])
    .withMessage('El estado debe ser active, inactive o training'),
  body('auto_response')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('La respuesta automática debe tener máximo 2000 caracteres'),
  body('ai_prompt')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('El prompt de IA debe tener máximo 2000 caracteres'),
  handleValidationErrors
];

// Validaciones para integraciones
export const validateCreateIntegration = [
  body('platform')
    .isIn(['whatsapp', 'facebook', 'instagram', 'telegram'])
    .withMessage('La plataforma debe ser whatsapp, facebook, instagram o telegram'),
  body('credentials')
    .isObject()
    .withMessage('Las credenciales deben ser un objeto'),
  body('webhook_url')
    .optional()
    .isURL()
    .withMessage('La URL del webhook debe ser válida'),
  handleValidationErrors
];

// Validaciones para parámetros de ruta
export const validateUUID = [
  param('id')
    .isUUID()
    .withMessage('El ID debe ser un UUID válido'),
  handleValidationErrors
];

// Validaciones para consultas
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entero entre 1 y 100'),
  handleValidationErrors
];
