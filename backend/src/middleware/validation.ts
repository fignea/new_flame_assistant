import { Request, Response, NextFunction } from 'express';

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export class ValidationError extends Error {
  public field: string;
  public value: any;

  constructor(field: string, value: any, message: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

export const validateRequest = (rules: ValidationRule[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: ValidationError[] = [];
    const body = req.body;

    for (const rule of rules) {
      const value = body[rule.field];

      // Verificar si el campo es requerido
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(new ValidationError(
          rule.field,
          value,
          `El campo '${rule.field}' es requerido`
        ));
        continue;
      }

      // Si el campo no es requerido y no está presente, saltar validaciones
      if (!rule.required && (value === undefined || value === null)) {
        continue;
      }

      // Validar tipo
      if (rule.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rule.type) {
          errors.push(new ValidationError(
            rule.field,
            value,
            `El campo '${rule.field}' debe ser de tipo ${rule.type}`
          ));
          continue;
        }
      }

      // Validar longitud mínima
      if (rule.minLength !== undefined && typeof value === 'string' && value.length < rule.minLength) {
        errors.push(new ValidationError(
          rule.field,
          value,
          `El campo '${rule.field}' debe tener al menos ${rule.minLength} caracteres`
        ));
      }

      // Validar longitud máxima
      if (rule.maxLength !== undefined && typeof value === 'string' && value.length > rule.maxLength) {
        errors.push(new ValidationError(
          rule.field,
          value,
          `El campo '${rule.field}' debe tener máximo ${rule.maxLength} caracteres`
        ));
      }

      // Validar valor mínimo
      if (rule.min !== undefined && typeof value === 'number' && value < rule.min) {
        errors.push(new ValidationError(
          rule.field,
          value,
          `El campo '${rule.field}' debe ser mayor o igual a ${rule.min}`
        ));
      }

      // Validar valor máximo
      if (rule.max !== undefined && typeof value === 'number' && value > rule.max) {
        errors.push(new ValidationError(
          rule.field,
          value,
          `El campo '${rule.field}' debe ser menor o igual a ${rule.max}`
        ));
      }

      // Validar patrón regex
      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        errors.push(new ValidationError(
          rule.field,
          value,
          `El campo '${rule.field}' no cumple con el formato requerido`
        ));
      }

      // Validación personalizada
      if (rule.custom) {
        const customResult = rule.custom(value);
        if (customResult !== true) {
          errors.push(new ValidationError(
            rule.field,
            value,
            typeof customResult === 'string' ? customResult : `El campo '${rule.field}' no es válido`
          ));
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errors.map(error => ({
          field: error.field,
          value: error.value,
          message: error.message
        }))
      });
    }

    next();
  };
};

// Validaciones específicas para diferentes endpoints
export const assignmentValidation = validateRequest([
  { field: 'assistant_id', required: true, type: 'number', min: 1 },
  { field: 'conversation_id', required: true, type: 'string', minLength: 1 },
  { field: 'platform', required: true, type: 'string', minLength: 1 }
]);

export const templateValidation = validateRequest([
  { field: 'name', required: true, type: 'string', minLength: 1, maxLength: 255 },
  { field: 'content', required: true, type: 'string', minLength: 1 },
  { field: 'assistant_id', type: 'number', min: 1 },
  { field: 'category', type: 'string' },
  { field: 'priority', type: 'number', min: 0, max: 100 },
  { field: 'response_delay', type: 'number', min: 0 },
  { field: 'trigger_keywords', type: 'array' }
]);

export const tagValidation = validateRequest([
  { field: 'name', required: true, type: 'string', minLength: 1, maxLength: 100 },
  { field: 'color', required: true, type: 'string', pattern: /^#[0-9A-Fa-f]{6}$/ },
  { field: 'description', type: 'string', maxLength: 500 }
]);

export const autoResponseValidation = validateRequest([
  { field: 'message', required: true, type: 'object' },
  { field: 'chat_id', required: true, type: 'string' },
  { field: 'response', required: true, type: 'string' }
]);

export const assistantValidation = validateRequest([
  { field: 'name', required: true, type: 'string', minLength: 1, maxLength: 255 },
  { field: 'description', type: 'string', maxLength: 1000 },
  { field: 'prompt', type: 'string', maxLength: 5000 },
  { field: 'model', type: 'string' },
  { field: 'max_tokens', type: 'number', min: 1, max: 4000 },
  { field: 'temperature', type: 'number', min: 0, max: 2 },
  { field: 'response_delay', type: 'number', min: 0, max: 3600 }
]);

// Validación de API key de OpenAI
export const validateOpenAIKey = (key: string): boolean => {
  return /^sk-[a-zA-Z0-9]{48}$/.test(key);
};

// Validación de email
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validación de URL
export const validateURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Validación de color hexadecimal
export const validateHexColor = (color: string): boolean => {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
};

// Validación de ID numérico
export const validateNumericId = (id: any): boolean => {
  const numId = Number(id);
  return !isNaN(numId) && numId > 0 && Number.isInteger(numId);
};
