import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Importar configuraciones
import { pool, checkDatabase } from './config/database.config';
import { connectRedis, checkRedis } from './config/redis.config';
import { validateJwtConfig } from './config/jwt.config';

// Importar middlewares
import { 
  errorHandler, 
  notFoundHandler, 
  jsonErrorHandler 
} from './middleware/error.middleware';
import { generalRateLimit } from './middleware/rateLimit.middleware';

// Importar rutas
import authRoutes from './routes/auth.routes';
import conversationsRoutes from './routes/conversations.routes';
import assistantsRoutes from './routes/assistants.routes';
import integrationRoutes from './routes/integration.routes';

// Importar utilidades
import { logger, logRequest } from './utils/logger';

// Cargar variables de entorno
dotenv.config();

class App {
  public app: express.Application;
  public server: any;
  public io: SocketIOServer;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:5173",
        methods: ["GET", "POST"]
      }
    });

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeSocketIO();
  }

  private initializeMiddlewares(): void {
    // Seguridad
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || "http://localhost:5173",
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Compresión
    this.app.use(compression());

    // Rate limiting
    this.app.use(generalRateLimit);

    // Logging
    this.app.use(morgan('combined', {
      stream: {
        write: (message: string) => {
          logger.info(message.trim());
        }
      }
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        logRequest(req, res, duration);
      });
      
      next();
    });
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', async (req, res) => {
      try {
        const dbStatus = await checkDatabase();
        const redisStatus = await checkRedis();
        
        const health = {
          status: 'OK',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: process.env.NODE_ENV || 'development',
          services: {
            database: dbStatus ? 'connected' : 'disconnected',
            redis: redisStatus ? 'connected' : 'disconnected'
          },
          memory: process.memoryUsage(),
          version: process.env.npm_package_version || '1.0.0'
        };

        const statusCode = (dbStatus && redisStatus) ? 200 : 503;
        res.status(statusCode).json(health);
      } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
          status: 'ERROR',
          timestamp: new Date().toISOString(),
          error: 'Health check failed'
        });
      }
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/conversations', conversationsRoutes);
    this.app.use('/api/assistants', assistantsRoutes);
    this.app.use('/api/integrations', integrationRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        message: '🔥 FLAME Assistant API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        documentation: '/api/docs'
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Error handlers
    this.app.use(jsonErrorHandler);
    this.app.use(errorHandler);
  }

  private initializeSocketIO(): void {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Unirse a sala de usuario
      socket.on('join-user-room', (userId: string) => {
        socket.join(`user:${userId}`);
        logger.info(`User ${userId} joined their room`);
      });

      // Dejar sala de usuario
      socket.on('leave-user-room', (userId: string) => {
        socket.leave(`user:${userId}`);
        logger.info(`User ${userId} left their room`);
      });

      // Unirse a sala de conversación
      socket.on('join-conversation', (conversationId: string) => {
        socket.join(`conversation:${conversationId}`);
        logger.info(`Client joined conversation: ${conversationId}`);
      });

      // Dejar sala de conversación
      socket.on('leave-conversation', (conversationId: string) => {
        socket.leave(`conversation:${conversationId}`);
        logger.info(`Client left conversation: ${conversationId}`);
      });

      // Manejar desconexión
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  public async start(): Promise<void> {
    try {
      // Validar configuración JWT
      validateJwtConfig();

      // Conectar a Redis
      await connectRedis();

      // Verificar conexión a la base de datos
      const dbConnected = await checkDatabase();
      if (!dbConnected) {
        throw new Error('No se pudo conectar a la base de datos');
      }

      const port = process.env.PORT || 3000;
      const host = process.env.HOST || '0.0.0.0';

      this.server.listen(port, host, () => {
        logger.info(`🚀 Servidor iniciado en http://${host}:${port}`);
        logger.info(`📊 Health check disponible en http://${host}:${port}/health`);
        logger.info(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
      });

      // Manejo de cierre graceful
      process.on('SIGTERM', this.gracefulShutdown.bind(this));
      process.on('SIGINT', this.gracefulShutdown.bind(this));

    } catch (error) {
      logger.error('Error al iniciar la aplicación:', error);
      process.exit(1);
    }
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    logger.info(`Recibida señal ${signal}, cerrando servidor...`);

    this.server.close(async () => {
      logger.info('Servidor HTTP cerrado');

      try {
        // Cerrar conexiones
        await pool.end();
        logger.info('Conexión a base de datos cerrada');

        // Cerrar Redis
        const { closeRedis } = await import('./config/redis.config');
        await closeRedis();
        logger.info('Conexión a Redis cerrada');

        logger.info('Aplicación cerrada exitosamente');
        process.exit(0);
      } catch (error) {
        logger.error('Error durante el cierre:', error);
        process.exit(1);
      }
    });

    // Forzar cierre después de 30 segundos
    setTimeout(() => {
      logger.error('Forzando cierre del servidor');
      process.exit(1);
    }, 30000);
  }

  public getApp(): express.Application {
    return this.app;
  }

  public getServer(): any {
    return this.server;
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}

// Crear instancia de la aplicación
const app = new App();

// Iniciar servidor
if (require.main === module) {
  app.start();
}

export default app;
