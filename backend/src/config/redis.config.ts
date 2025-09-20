import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    connectTimeout: 10000,
    lazyConnect: true
  },
  retry_strategy: (options: any) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      console.error('❌ Redis server connection refused');
      return new Error('Redis server connection refused');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      console.error('❌ Redis retry time exhausted');
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      console.error('❌ Redis max retry attempts reached');
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  }
};

export const redisClient: RedisClientType = createClient(redisConfig);

// Eventos de Redis
redisClient.on('connect', () => {
  console.log('✅ Conexión a Redis establecida');
});

redisClient.on('error', (err) => {
  console.error('❌ Error de Redis:', err);
});

redisClient.on('ready', () => {
  console.log('✅ Redis está listo para recibir comandos');
});

// Función para conectar Redis
export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('❌ Error al conectar con Redis:', error);
    throw error;
  }
};

// Función para verificar Redis
export const checkRedis = async (): Promise<boolean> => {
  try {
    await redisClient.ping();
    return true;
  } catch (error) {
    console.error('❌ Error al verificar Redis:', error);
    return false;
  }
};

// Función para cerrar Redis
export const closeRedis = async (): Promise<void> => {
  await redisClient.quit();
};

// Funciones de utilidad para Redis
export const redisUtils = {
  // Almacenar datos con expiración
  setex: async (key: string, value: string, seconds: number): Promise<void> => {
    await redisClient.setEx(key, seconds, value);
  },

  // Obtener datos
  get: async (key: string): Promise<string | null> => {
    return await redisClient.get(key);
  },

  // Eliminar datos
  del: async (key: string): Promise<number> => {
    return await redisClient.del(key);
  },

  // Verificar si existe una clave
  exists: async (key: string): Promise<boolean> => {
    const result = await redisClient.exists(key);
    return result === 1;
  },

  // Almacenar datos JSON
  setJson: async (key: string, value: any, seconds?: number): Promise<void> => {
    const jsonValue = JSON.stringify(value);
    if (seconds) {
      await redisClient.setEx(key, seconds, jsonValue);
    } else {
      await redisClient.set(key, jsonValue);
    }
  },

  // Obtener datos JSON
  getJson: async <T>(key: string): Promise<T | null> => {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  }
};

export default redisClient;
