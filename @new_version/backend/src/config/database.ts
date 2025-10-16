import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'flame_assistant',
  user: process.env.DB_USER || 'flame_user',
  password: process.env.DB_PASSWORD || 'flame_password',
  max: 20, // Máximo número de clientes en el pool
  idleTimeoutMillis: 30000, // Tiempo de inactividad antes de cerrar un cliente
  connectionTimeoutMillis: 2000, // Tiempo de espera para conectar
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Pool de conexiones
let pool: Pool;

// Inicializar pool de conexiones
export const initializeDatabase = async (): Promise<void> => {
  try {
    pool = new Pool(dbConfig);
    
    // Probar conexión
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    logger.info('✅ Base de datos PostgreSQL conectada exitosamente');
    
    // Configurar parámetros de sesión para multi-tenancy
    // TODO: Implementar configuración de parámetros de sesión
    // await pool.query(`
    //   ALTER DATABASE ${dbConfig.database} SET app.current_tenant_id = NULL;
    //   ALTER DATABASE ${dbConfig.database} SET app.current_user_id = NULL;
    // `);
    
  } catch (error) {
    logger.error('❌ Error conectando a la base de datos:', error);
    throw error;
  }
};

// Obtener cliente del pool
export const getClient = async (): Promise<PoolClient> => {
  if (!pool) {
    throw new Error('Pool de base de datos no inicializado');
  }
  return await pool.connect();
};

// Ejecutar query con contexto multi-tenant
export const query = async (text: string, params: any[] = []): Promise<any> => {
  const client = await getClient();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

// Ejecutar query y devolver una fila
export const get = async (text: string, params: any[] = []): Promise<any> => {
  const result = await query(text, params);
  return result.rows[0] || null;
};

// Ejecutar query y devolver todas las filas
export const all = async (text: string, params: any[] = []): Promise<any[]> => {
  const result = await query(text, params);
  return result.rows;
};

// Ejecutar query de inserción/actualización y devolver ID
export const run = async (text: string, params: any[] = []): Promise<any> => {
  const result = await query(text, params);
  return result.rows[0]?.id || result.insertId || result.lastID;
};

// Ejecutar query en una transacción
export const transaction = async <T>(callback: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Configurar contexto del tenant para una conexión
export const setTenantContext = async (tenantId: string, userId?: string): Promise<void> => {
  // TODO: Implementar configuración de contexto de tenant
  // const client = await getClient();
  // try {
  //   await client.query('SET app.current_tenant_id = $1', [tenantId]);
  //   if (userId) {
  //     await client.query('SET app.current_user_id = $1', [userId]);
  //   }
  // } finally {
  //   client.release();
  // }
};

// Limpiar contexto del tenant
export const clearTenantContext = async (): Promise<void> => {
  // TODO: Implementar limpieza de contexto de tenant
  // const client = await getClient();
  // try {
  //   await client.query('SET app.current_tenant_id = NULL');
  //   await client.query('SET app.current_user_id = NULL');
  // } finally {
  //   client.release();
  // }
};

// Verificar si una tabla existe
export const tableExists = async (tableName: string): Promise<boolean> => {
  const result = await get(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    )`,
    [tableName]
  );
  return result?.exists || false;
};

// Obtener información de la base de datos
export const getDatabaseInfo = async (): Promise<any> => {
  const version = await get('SELECT version()');
  const uptime = await get('SELECT NOW() - pg_postmaster_start_time() as uptime');
  const connections = await get('SELECT count(*) as active_connections FROM pg_stat_activity');
  const databases = await all('SELECT datname FROM pg_database WHERE datistemplate = false');
  
  return {
    version: version?.version,
    uptime: uptime?.uptime,
    active_connections: connections?.active_connections,
    databases: databases.map(db => db.datname)
  };
};

// Obtener estadísticas de tablas
export const getTableStats = async (): Promise<any[]> => {
  return await all(`
    SELECT 
      schemaname,
      tablename,
      attname,
      n_distinct,
      correlation
    FROM pg_stats 
    WHERE schemaname = 'public'
    ORDER BY tablename, attname
  `);
};

// Cerrar pool de conexiones
export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    logger.info('🔌 Pool de base de datos cerrado');
  }
};

// Exportar pool para uso directo si es necesario
export { pool };

// Clase Database para compatibilidad con código existente
export class Database {
  static async get(text: string, params: any[] = []): Promise<any> {
    return await get(text, params);
  }

  static async all(text: string, params: any[] = []): Promise<any[]> {
    return await all(text, params);
  }

  static async run(text: string, params: any[] = []): Promise<any> {
    return await run(text, params);
  }

  static async query(text: string, params: any[] = []): Promise<any> {
    return await query(text, params);
  }

  static async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    return await transaction(callback);
  }
}

// Instancia de base de datos para compatibilidad
export const database = Database;