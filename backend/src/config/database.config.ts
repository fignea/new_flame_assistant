import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost', // Usar localhost para desarrollo local
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'flame_assistant',
  user: process.env.DB_USER || 'flame_user',
  password: process.env.DB_PASSWORD || 'password',
  max: 20, // máximo de conexiones en el pool
  idleTimeoutMillis: 30000, // tiempo de inactividad antes de cerrar conexión
  connectionTimeoutMillis: 2000, // tiempo máximo para establecer conexión
  ssl: false // Deshabilitar SSL para desarrollo local
};

export const pool = new Pool(dbConfig);

// Eventos del pool de conexiones
pool.on('connect', () => {
  console.log('✅ Conexión a la base de datos establecida');
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de conexiones:', err);
  process.exit(-1);
});

// Función para verificar la conexión
export const checkDatabase = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Error al conectar con la base de datos:', error);
    return false;
  }
};

// Función para cerrar el pool
export const closeDatabase = async (): Promise<void> => {
  await pool.end();
};

export default pool;
