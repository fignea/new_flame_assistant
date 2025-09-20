import winston from 'winston';
import path from 'path';

// Configuración de formatos
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Crear el logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'flame-assistant-backend' },
  transports: [
    // Archivo de errores
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: logFormat
    }),
    
    // Archivo combinado
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: logFormat
    })
  ]
});

// Agregar transporte de consola solo si no estamos en producción
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Función para logging de requests HTTP
export const logRequest = (req: any, res: any, responseTime: number) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId || 'anonymous'
  };

  if (res.statusCode >= 400) {
    logger.warn('HTTP Request', logData);
  } else {
    logger.info('HTTP Request', logData);
  }
};

// Función para logging de errores
export const logError = (error: Error, context?: any) => {
  logger.error('Error occurred', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    context
  });
};

// Función para logging de operaciones de base de datos
export const logDatabaseOperation = (operation: string, table: string, duration: number, success: boolean) => {
  const level = success ? 'info' : 'error';
  logger[level]('Database Operation', {
    operation,
    table,
    duration: `${duration}ms`,
    success
  });
};

// Función para logging de operaciones de Redis
export const logRedisOperation = (operation: string, key: string, duration: number, success: boolean) => {
  const level = success ? 'info' : 'error';
  logger[level]('Redis Operation', {
    operation,
    key,
    duration: `${duration}ms`,
    success
  });
};

// Función para logging de autenticación
export const logAuth = (event: string, userId?: string, email?: string, success: boolean = true) => {
  const level = success ? 'info' : 'warn';
  logger[level]('Authentication Event', {
    event,
    userId,
    email,
    success,
    timestamp: new Date().toISOString()
  });
};

// Función para logging de integraciones
export const logIntegration = (platform: string, event: string, data?: any, success: boolean = true) => {
  const level = success ? 'info' : 'error';
  logger[level]('Integration Event', {
    platform,
    event,
    data,
    success,
    timestamp: new Date().toISOString()
  });
};

// Función para logging de IA
export const logAI = (operation: string, model: string, tokens: number, duration: number, success: boolean = true) => {
  const level = success ? 'info' : 'error';
  logger[level]('AI Operation', {
    operation,
    model,
    tokens,
    duration: `${duration}ms`,
    success,
    timestamp: new Date().toISOString()
  });
};

// Función para logging de webhooks
export const logWebhook = (platform: string, event: string, data: any, success: boolean = true) => {
  const level = success ? 'info' : 'error';
  logger[level]('Webhook Event', {
    platform,
    event,
    data: JSON.stringify(data),
    success,
    timestamp: new Date().toISOString()
  });
};

export default logger;
