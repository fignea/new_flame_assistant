import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';

// Configurar variables de entorno
dotenv.config();

// Importar configuraciones
import { database } from './config/database';
import { redisConfig } from './config/redis';
import { logger, logRequest } from './utils/logger';

// Importar rutas
import authRoutes from './routes/auth';
import whatsappRoutes from './routes/whatsapp';
import scheduledRoutes from './routes/scheduled';
import integrationsRoutes from './routes/integrations';
import assistantsRoutes from './routes/assistants';
import configRoutes from './routes/config';
import messagesRoutes from './routes/messages';
import organizationsRoutes from './routes/organizations';

// Importar servicios
import { whatsappService } from './services/WhatsAppService';
import { scheduledMessagesService } from './services/ScheduledMessagesService';
import { setSocketIO } from './controllers/WebController';

// Importar middleware de autenticación para sockets
import jwt from 'jsonwebtoken';
import { JwtPayload } from './middleware/auth';

class WhatsAppManagerServer {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private userSockets: Map<number, string> = new Map(); // userId -> socketId

  constructor() {
    console.log('🔧 Initializing WhatsApp Manager Server...');
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: [
          process.env.CORS_ORIGIN || "http://localhost:5173",
          "http://localhost:80",
          "http://localhost",
          "http://127.0.0.1:80",
          "http://127.0.0.1"
        ],
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    console.log('🔧 Setting up middleware...');
    this.setupMiddleware();
    console.log('🔧 Setting up routes...');
    this.setupRoutes();
    console.log('🔧 Setting up Socket.IO...');
    try {
      this.setupSocketIO();
      console.log('✅ Socket.IO setup complete');
    } catch (error) {
      console.error('❌ Error setting up Socket.IO:', error);
    }
    console.log('🔧 Setting up WhatsApp events...');
    this.setupWhatsAppEvents();
    console.log('🔧 Setting up Web Chat events...');
    this.setupWebChatEvents();
    console.log('🔧 Setting up Web Controller Socket.IO...');
    setSocketIO(this.io);
    console.log('✅ Server initialization complete');
  }

  private setupMiddleware(): void {
    // Seguridad
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"],
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

    // Logging
    this.app.use(morgan('combined'));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Servir archivos estáticos (para el frontend en producción)
    if (process.env.NODE_ENV === 'production') {
      this.app.use(express.static(path.join(__dirname, '../../frontend/dist')));
    }
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', async (req, res) => {
      try {
        const [dbStatus, redisStatus] = await Promise.all([
          database.checkConnection(),
          redisConfig.checkConnection()
        ]);
        
        const whatsappStats = whatsappService.getStats();
        const schedulerStats = scheduledMessagesService.getStats();
        
        const health = {
          status: 'OK',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: process.env.NODE_ENV || 'development',
          services: {
            database: dbStatus ? 'connected' : 'disconnected',
            redis: redisStatus ? 'connected' : 'disconnected',
            whatsapp: whatsappStats,
            scheduler: schedulerStats
          },
          memory: process.memoryUsage(),
          version: '1.0.0'
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

    // Ruta de prueba directa
    this.app.get('/api/test-auth', async (req, res) => {
      try {
        const authHeader = req.headers.authorization;
        console.log('🔍 Test Auth - Headers:', authHeader);
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.json({ success: false, message: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const jwtSecret = process.env.JWT_SECRET;
        
        console.log('🔍 Test Auth - Token:', token.substring(0, 20) + '...');
        console.log('🔍 Test Auth - Secret:', jwtSecret?.substring(0, 10) + '...');
        
        if (!jwtSecret) {
          return res.json({ success: false, message: 'JWT_SECRET not configured' });
        }

        const decoded = jwt.verify(token, jwtSecret);
        console.log('🔍 Test Auth - Decoded:', decoded);
        
        return res.json({ 
          success: true, 
          message: 'Token válido',
          decoded 
        });
      } catch (error: any) {
        console.log('🔍 Test Auth - Error:', error.message);
        return res.json({ 
          success: false, 
          message: 'Token error: ' + error.message 
        });
      }
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/organizations', organizationsRoutes);
    this.app.use('/api/whatsapp', whatsappRoutes);
    this.app.use('/api/scheduled', scheduledRoutes);
    this.app.use('/api/integrations', integrationsRoutes);
    this.app.use('/api/assistants', assistantsRoutes);
    this.app.use('/api/config', configRoutes);
    this.app.use('/api/messages', messagesRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        message: '🔥 WhatsApp Manager API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        docs: '/api/docs'
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint no encontrado'
      });
    });

    // Error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Global error handler:', error);
      
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    });
  }

  private setupSocketIO(): void {
    console.log('🔧 Setting up Socket.IO middleware...');
    console.log('🔧 Socket.IO instance:', !!this.io);
    
    // Verificar que this.io existe
    if (!this.io) {
      console.error('❌ Socket.IO instance not found');
      return;
    }
    
    // Middleware de autenticación para sockets
    this.io.use(async (socket, next) => {
      console.log('🔐 Socket middleware triggered');
      try {
        const token = socket.handshake.auth.token;
        console.log('🔐 Socket authentication attempt:', { 
          hasToken: !!token, 
          tokenLength: token?.length,
          auth: socket.handshake.auth 
        });
        
        if (!token) {
          console.log('❌ No token provided');
          return next(new Error('Token requerido'));
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          console.log('❌ No JWT secret configured');
          return next(new Error('Configuración JWT no válida'));
        }

        const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
        console.log('🔍 Token decoded:', { userId: decoded.userId });
        
        // Verificar usuario
        const user = await database.get(
          'SELECT id, email, name FROM users WHERE id = $1',
          [decoded.userId]
        );

        if (!user) {
          console.log('❌ User not found:', decoded.userId);
          return next(new Error('Usuario no válido'));
        }

        console.log('✅ User authenticated:', { id: user.id, email: user.email });

        // Agregar información del usuario al socket
        (socket as any).userId = user.id;
        (socket as any).userEmail = user.email;
        
        next();
      } catch (error) {
        console.log('❌ Token validation error:', error);
        next(new Error('Token inválido'));
      }
    });

    // Eventos de conexión
    this.io.on('connection', (socket) => {
      const userId = (socket as any).userId;
      const userEmail = (socket as any).userEmail;
      
      console.log(`🔌 User ${userEmail} (${userId}) connected: ${socket.id}`);
      
      // Registrar socket del usuario
      this.userSockets.set(userId, socket.id);

      // Unirse a sala personal
      socket.join(`user:${userId}`);

      // Eventos del socket
      socket.on('disconnect', () => {
        console.log(`🔌 User ${userEmail} (${userId}) disconnected: ${socket.id}`);
        this.userSockets.delete(userId);
      });

      // Ping-pong para mantener conexión
      socket.on('ping', () => {
        socket.emit('pong');
      });
    });

    console.log('✅ Socket.IO configured');
  }

  private setupWhatsAppEvents(): void {
    // Eventos del servicio de WhatsApp
    whatsappService.on('qr', (userId: number, qrCode: string) => {
      console.log(`📱 QR generated for user ${userId}`);
      this.io.to(`user:${userId}`).emit('whatsapp:qr', { qrCode });
    });

    whatsappService.on('connected', (userId: number, status: any) => {
      console.log(`✅ WhatsApp connected for user ${userId}`);
      this.io.to(`user:${userId}`).emit('whatsapp:connected', status);
    });

    whatsappService.on('disconnected', (userId: number) => {
      console.log(`❌ WhatsApp disconnected for user ${userId}`);
      this.io.to(`user:${userId}`).emit('whatsapp:disconnected');
    });

    whatsappService.on('message', (userId: number, message: any) => {
      console.log(`💬 New message for user ${userId}`);
      this.io.to(`user:${userId}`).emit('whatsapp:message', message);
    });

    whatsappService.on('contact', (userId: number, contact: any) => {
      console.log(`👤 Contact update for user ${userId}`);
      this.io.to(`user:${userId}`).emit('whatsapp:contact', contact);
    });

    console.log('✅ WhatsApp events configured');
  }

  private setupWebChatEvents(): void {
    // Eventos del chat web
    this.io.on('connection', (socket) => {
      const userId = (socket as any).userId;
      
      // Unirse a sala de chat web
      socket.join(`web:${userId}`);

      // Eventos específicos del chat web
      socket.on('web:join:conversation', (conversationId: number) => {
        socket.join(`web:conversation:${conversationId}`);
        console.log(`👤 User ${userId} joined web conversation ${conversationId}`);
      });

      socket.on('web:leave:conversation', (conversationId: number) => {
        socket.leave(`web:conversation:${conversationId}`);
        console.log(`👤 User ${userId} left web conversation ${conversationId}`);
      });

      socket.on('web:typing:start', (data: { conversationId: number, visitorId: number }) => {
        socket.to(`web:conversation:${data.conversationId}`).emit('web:typing:start', data);
      });

      socket.on('web:typing:stop', (data: { conversationId: number, visitorId: number }) => {
        socket.to(`web:conversation:${data.conversationId}`).emit('web:typing:stop', data);
      });

      socket.on('disconnect', () => {
        console.log(`🔌 User ${userId} disconnected from web chat`);
      });
    });

    console.log('✅ Web Chat events configured');
  }

  public async start(): Promise<void> {
    const port = process.env.PORT || 3001;
    const host = process.env.HOST || '0.0.0.0';

    try {
      // Verificar configuración JWT
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET no configurado');
      }

      // Conectar a Redis
      await redisConfig.connect();
      logger.info('✅ Redis conectado');

      // Verificar conexión a PostgreSQL
      const dbConnected = await database.checkConnection();
      if (!dbConnected) {
        throw new Error('No se pudo conectar a PostgreSQL');
      }
      logger.info('✅ PostgreSQL conectado');

      // Inicializar tablas
      await database.initializeTables();
      logger.info('✅ Tablas de base de datos inicializadas');

      this.server.listen(port, host, () => {
        console.log(`
🚀 WhatsApp Manager Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Server: http://${host}:${port}
🏥 Health: http://${host}:${port}/health  
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📊 Database: PostgreSQL (${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME})
🔐 JWT: Configured
📱 WhatsApp: Ready
📅 Scheduler: Active
🔌 Socket.IO: Ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔑 Default Login:
   Email: admin@flame.com
   Password: flame123
        `);
      });

      // Manejo de cierre graceful
      process.on('SIGTERM', this.gracefulShutdown.bind(this));
      process.on('SIGINT', this.gracefulShutdown.bind(this));

    } catch (error) {
      console.error('❌ Error starting server:', error);
      process.exit(1);
    }
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

    this.server.close(async () => {
      console.log('📡 HTTP server closed');

      try {
        // Cerrar conexiones
        await database.close();
        logger.info('🗃️ PostgreSQL connection closed');
        
        await redisConfig.disconnect();
        logger.info('🔌 Redis connection closed');

        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });

    // Forzar cierre después de 30 segundos
    setTimeout(() => {
      console.error('⏰ Forcing shutdown after timeout');
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

// Crear y iniciar servidor
const server = new WhatsAppManagerServer();

if (require.main === module) {
  server.start();
}

export default server;
