import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

class DatabaseConfig {
  private pool: Pool;
  private static instance: DatabaseConfig;

  private constructor() {
    const config: PoolConfig = {
      host: process.env.DB_HOST || 'postgres',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'whatsapp_manager',
      user: process.env.DB_USER || 'whatsapp_user',
      password: process.env.DB_PASSWORD || 'whatsapp_password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    this.pool = new Pool(config);

    this.pool.on('connect', () => {
      logger.info('Nueva conexión establecida con PostgreSQL');
    });

    this.pool.on('error', (err) => {
      logger.error('Error inesperado en cliente PostgreSQL:', err);
    });
  }

  public static getInstance(): DatabaseConfig {
    if (!DatabaseConfig.instance) {
      DatabaseConfig.instance = new DatabaseConfig();
    }
    return DatabaseConfig.instance;
  }

  public async initializeTables(): Promise<void> {
    try {
      logger.info('Verificando tablas de la base de datos...');

      // Solo verificar que las tablas existen (ya fueron creadas por el script init-db.sql)
      const result = await this.pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'whatsapp_sessions', 'contacts', 'messages', 'scheduled_messages', 'assistants')
      `);

      logger.info(`✅ Tablas encontradas: ${result.rows.length}`);
      logger.info('✅ Base de datos lista para usar');
    } catch (error) {
      logger.error('❌ Error verificando tablas:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    try {
      logger.info('Creando tablas de la base de datos...');

      // Crear extensión UUID si no existe
      await this.pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

      // Tabla de usuarios
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de sesiones de WhatsApp
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_sessions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          session_id VARCHAR(255) UNIQUE NOT NULL,
          phone_number VARCHAR(50),
          name VARCHAR(255),
          is_connected BOOLEAN DEFAULT FALSE,
          qr_code TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de contactos
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS contacts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          whatsapp_id VARCHAR(255) NOT NULL,
          name VARCHAR(255),
          phone_number VARCHAR(50),
          is_group BOOLEAN DEFAULT FALSE,
          is_blocked BOOLEAN DEFAULT FALSE,
          avatar_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, whatsapp_id)
        )
      `);

      // Tabla de mensajes
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          whatsapp_message_id VARCHAR(255) NOT NULL,
          contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
          chat_id VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          message_type VARCHAR(50) DEFAULT 'text',
          is_from_me BOOLEAN DEFAULT FALSE,
          timestamp TIMESTAMP NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          media_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de programación
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS scheduled_messages (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          message_type VARCHAR(50) DEFAULT 'text',
          scheduled_time TIMESTAMP NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          sent_at TIMESTAMP,
          error_message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de conversaciones
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS conversations (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          context TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de asistentes
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS assistants (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          type VARCHAR(50) NOT NULL,
          integrations TEXT DEFAULT '[]',
          responses TEXT DEFAULT '{}',
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de visitantes web
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS web_visitors (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          session_id VARCHAR(255) NOT NULL,
          name VARCHAR(255),
          email VARCHAR(255),
          phone VARCHAR(50),
          ip_address INET,
          user_agent TEXT,
          location VARCHAR(255),
          is_online BOOLEAN DEFAULT FALSE,
          last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, session_id)
        )
      `);

      // Tabla de conversaciones web
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS web_conversations (
          id SERIAL PRIMARY KEY,
          public_id VARCHAR(20) UNIQUE NOT NULL,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          visitor_id INTEGER REFERENCES web_visitors(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          status VARCHAR(50) DEFAULT 'active',
          assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
          priority VARCHAR(20) DEFAULT 'normal',
          tags TEXT DEFAULT '[]',
          metadata TEXT DEFAULT '{}',
          last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de mensajes web
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS web_messages (
          id SERIAL PRIMARY KEY,
          conversation_id INTEGER REFERENCES web_conversations(id) ON DELETE CASCADE,
          sender_type VARCHAR(20) NOT NULL,
          sender_id INTEGER,
          content TEXT NOT NULL,
          message_type VARCHAR(50) DEFAULT 'text',
          is_read BOOLEAN DEFAULT FALSE,
          metadata TEXT DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Crear usuario por defecto si no existe
      await this.createDefaultUser();

      logger.info('✅ Tablas de base de datos inicializadas correctamente');

    } catch (error) {
      logger.error('❌ Error inicializando tablas:', error);
      throw error;
    }
  }

  private async createDefaultUser(): Promise<void> {
    try {
      const bcrypt = require('bcryptjs');
      const email = 'admin@flame.com';
      const password = bcrypt.hashSync('flame123', 10);
      const name = 'Administrator';

      const result = await this.pool.query(
        `INSERT INTO users (email, password, name) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (email) DO NOTHING 
         RETURNING id`,
        [email, password, name]
      );

      if (result.rowCount && result.rowCount > 0) {
        logger.info('✅ Usuario por defecto creado: admin@flame.com / flame123');
      } else {
        logger.info('ℹ️ Usuario por defecto ya existe');
      }

      // Crear índices para las nuevas tablas web
      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_web_visitors_user_id ON web_visitors(user_id);
        CREATE INDEX IF NOT EXISTS idx_web_visitors_session_id ON web_visitors(session_id);
        CREATE INDEX IF NOT EXISTS idx_web_visitors_is_online ON web_visitors(is_online);
        CREATE INDEX IF NOT EXISTS idx_web_conversations_public_id ON web_conversations(public_id);
        CREATE INDEX IF NOT EXISTS idx_web_conversations_user_id ON web_conversations(user_id);
        CREATE INDEX IF NOT EXISTS idx_web_conversations_visitor_id ON web_conversations(visitor_id);
        CREATE INDEX IF NOT EXISTS idx_web_conversations_status ON web_conversations(status);
        CREATE INDEX IF NOT EXISTS idx_web_conversations_assigned_to ON web_conversations(assigned_to);
        CREATE INDEX IF NOT EXISTS idx_web_conversations_last_message_at ON web_conversations(last_message_at);
        CREATE INDEX IF NOT EXISTS idx_web_messages_conversation_id ON web_messages(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_web_messages_sender_type ON web_messages(sender_type);
        CREATE INDEX IF NOT EXISTS idx_web_messages_created_at ON web_messages(created_at);
        CREATE INDEX IF NOT EXISTS idx_web_messages_is_read ON web_messages(is_read);
      `);

    } catch (error) {
      logger.error('❌ Error creando usuario por defecto:', error);
    }
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Query ejecutada', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      logger.error('Error en query de base de datos:', { text, params, error });
      throw error;
    }
  }

  public async checkConnection(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('❌ Error de conexión a PostgreSQL:', error);
      return false;
    }
  }

  public async close(): Promise<void> {
    try {
      await this.pool.end();
      logger.info('🔌 Conexión a PostgreSQL cerrada');
    } catch (error) {
      logger.error('❌ Error cerrando conexión PostgreSQL:', error);
    }
  }

  // Métodos de compatibilidad con la API anterior
  public async get(query: string, params: any[] = []): Promise<any> {
    try {
      const result = await this.query(query, params);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error en get query:', error);
      throw error;
    }
  }

  public async run(query: string, params: any[] = []): Promise<{ id: number; changes: number }> {
    try {
      const result = await this.query(query, params);
      return { 
        id: result.rows[0]?.id || 0, 
        changes: result.rowCount || 0 
      };
    } catch (error) {
      logger.error('Error en run query:', error);
      throw error;
    }
  }

  public async all(query: string, params: any[] = []): Promise<any[]> {
    try {
      const result = await this.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error en all query:', error);
      throw error;
    }
  }
}

export const database = DatabaseConfig.getInstance();
export const pool = database.getPool();