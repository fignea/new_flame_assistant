import winston from 'winston';
import path from 'path';

// Configuración del logger
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'whatsapp-manager' },
  transports: [
    // Escribir logs de error a archivo
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Escribir todos los logs a archivo combinado
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Si no estamos en producción, también log a consola
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Función para log de requests HTTP
export const logRequest = (req: any, res: any, duration: number) => {
  const { method, url, ip } = req;
  const { statusCode } = res;
  
  logger.info('HTTP Request', {
    method,
    url,
    ip,
    statusCode,
    duration: `${duration}ms`,
    userAgent: req.get('User-Agent')
  });
};

// Función para log de errores de aplicación
export const logError = (error: Error, context?: any) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    context
  });
};

// Función para log de actividad de WhatsApp
export const logWhatsApp = (action: string, userId: number, details?: any) => {
  logger.info('WhatsApp Activity', {
    action,
    userId,
    details,
    timestamp: new Date().toISOString()
  });
};

export default logger;
