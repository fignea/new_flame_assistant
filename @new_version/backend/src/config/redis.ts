import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

class RedisConfig {
  private client: RedisClientType;
  private static instance: RedisConfig;

  private constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://redis:6379',
      password: process.env.REDIS_PASSWORD,
      database: parseInt(process.env.REDIS_DB || '0'),
      socket: {
        connectTimeout: 5000,
      },
    });

    this.client.on('error', (err) => {
      logger.error('❌ Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      logger.info('🔄 Conectando a Redis...');
    });

    this.client.on('ready', () => {
      logger.info('✅ Redis conectado y listo');
    });

    this.client.on('end', () => {
      logger.info('🔌 Conexión Redis cerrada');
    });

    this.client.on('reconnecting', () => {
      logger.info('🔄 Reconectando a Redis...');
    });
  }

  public static getInstance(): RedisConfig {
    if (!RedisConfig.instance) {
      RedisConfig.instance = new RedisConfig();
    }
    return RedisConfig.instance;
  }

  public async connect(): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
        logger.info('✅ Conexión a Redis establecida');
      }
    } catch (error) {
      logger.error('❌ Error conectando a Redis:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.client.isOpen) {
        await this.client.disconnect();
        logger.info('🔌 Desconectado de Redis');
      }
    } catch (error) {
      logger.error('❌ Error desconectando de Redis:', error);
    }
  }

  public getClient(): RedisClientType {
    return this.client;
  }

  public async checkConnection(): Promise<boolean> {
    try {
      if (!this.client.isOpen) {
        await this.connect();
      }
      await this.client.ping();
      return true;
    } catch (error) {
      logger.error('❌ Redis health check falló:', error);
      return false;
    }
  }

  // Métodos de utilidad para sesiones
  public async setSession(key: string, value: any, expireInSeconds: number = 3600): Promise<void> {
    try {
      await this.client.setEx(key, expireInSeconds, JSON.stringify(value));
    } catch (error) {
      logger.error('❌ Error guardando sesión en Redis:', error);
      throw error;
    }
  }

  public async getSession(key: string): Promise<any> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('❌ Error obteniendo sesión de Redis:', error);
      return null;
    }
  }

  public async deleteSession(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('❌ Error eliminando sesión de Redis:', error);
    }
  }

  // Métodos para cache de QR codes
  public async setQRCode(userId: number, qrData: { qr: string; dataURL: string }): Promise<void> {
    try {
      const key = `qr:${userId}`;
      await this.client.setEx(key, 300, JSON.stringify(qrData)); // 5 minutos
    } catch (error) {
      logger.error('❌ Error guardando QR en Redis:', error);
    }
  }

  public async getQRCode(userId: number): Promise<{ qr: string; dataURL: string } | null> {
    try {
      const key = `qr:${userId}`;
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('❌ Error obteniendo QR de Redis:', error);
      return null;
    }
  }

  public async deleteQRCode(userId: number): Promise<void> {
    try {
      const key = `qr:${userId}`;
      await this.client.del(key);
    } catch (error) {
      logger.error('❌ Error eliminando QR de Redis:', error);
    }
  }

  // Métodos para rate limiting
  public async incrementRateLimit(key: string, windowMs: number): Promise<number> {
    try {
      const multi = this.client.multi();
      multi.incr(key);
      multi.expire(key, Math.ceil(windowMs / 1000));
      const results = await multi.exec();
      return results ? (results[0] as number) : 0;
    } catch (error) {
      logger.error('❌ Error en rate limiting:', error);
      return 0;
    }
  }
}

export const redisConfig = RedisConfig.getInstance();
export const redisClient = redisConfig.getClient();
