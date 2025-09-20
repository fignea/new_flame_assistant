import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Configuración base para rate limiting
const createRateLimit = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Demasiadas solicitudes',
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Demasiadas solicitudes',
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Rate limit general para todas las rutas
export const generalRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutos
  100, // máximo 100 requests por IP
  'Demasiadas solicitudes desde esta IP, intenta de nuevo en 15 minutos'
);

// Rate limit estricto para autenticación
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutos
  5, // máximo 5 intentos de login por IP
  'Demasiados intentos de autenticación, intenta de nuevo en 15 minutos'
);

// Rate limit para registro de usuarios
export const registerRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hora
  3, // máximo 3 registros por IP por hora
  'Demasiados intentos de registro, intenta de nuevo en 1 hora'
);

// Rate limit para recuperación de contraseña
export const passwordResetRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hora
  3, // máximo 3 intentos de recuperación por IP por hora
  'Demasiados intentos de recuperación de contraseña, intenta de nuevo en 1 hora'
);

// Rate limit para envío de mensajes
export const messageRateLimit = createRateLimit(
  60 * 1000, // 1 minuto
  30, // máximo 30 mensajes por IP por minuto
  'Demasiados mensajes enviados, intenta de nuevo en 1 minuto'
);

// Rate limit para webhooks
export const webhookRateLimit = createRateLimit(
  60 * 1000, // 1 minuto
  100, // máximo 100 webhooks por IP por minuto
  'Demasiados webhooks recibidos, intenta de nuevo en 1 minuto'
);

// Rate limit para APIs de IA
export const aiRateLimit = createRateLimit(
  60 * 1000, // 1 minuto
  10, // máximo 10 requests a IA por IP por minuto
  'Demasiadas solicitudes a la IA, intenta de nuevo en 1 minuto'
);

// Rate limit personalizado para usuarios autenticados
export const createUserRateLimit = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req: Request) => {
      // Usar el ID del usuario si está autenticado, sino la IP
      return req.user?.userId || req.ip || 'anonymous';
    },
    message: {
      error: 'Demasiadas solicitudes',
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Demasiadas solicitudes',
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Rate limit para usuarios autenticados (más permisivo)
export const authenticatedUserRateLimit = createUserRateLimit(
  15 * 60 * 1000, // 15 minutos
  200, // máximo 200 requests por usuario por 15 minutos
  'Demasiadas solicitudes, intenta de nuevo en 15 minutos'
);

// Rate limit para operaciones de escritura
export const writeOperationRateLimit = createUserRateLimit(
  60 * 1000, // 1 minuto
  20, // máximo 20 operaciones de escritura por usuario por minuto
  'Demasiadas operaciones de escritura, intenta de nuevo en 1 minuto'
);
