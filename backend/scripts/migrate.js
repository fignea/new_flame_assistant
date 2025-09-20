const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración de la base de datos
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'flame_assistant',
  user: process.env.DB_USER || 'flame_user',
  password: process.env.DB_PASSWORD || 'flame_password',
  ssl: false
});

// Función para ejecutar migraciones
async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Ejecutando migraciones...');
    
    // Crear tabla de migraciones si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Obtener migraciones ya ejecutadas
    const executedMigrations = await client.query('SELECT name FROM migrations ORDER BY id');
    const executedNames = executedMigrations.rows.map(row => row.name);
    
    // Leer archivos de migración
    const migrationsDir = path.join(__dirname, 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.log('📁 No hay directorio de migraciones, creando...');
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    if (migrationFiles.length === 0) {
      console.log('📝 No hay archivos de migración para ejecutar');
      return;
    }
    
    let executedCount = 0;
    
    for (const file of migrationFiles) {
      const migrationName = file.replace('.sql', '');
      
      if (executedNames.includes(migrationName)) {
        console.log(`⏭️  Migración ${migrationName} ya ejecutada, omitiendo...`);
        continue;
      }
      
      console.log(`🔄 Ejecutando migración: ${migrationName}`);
      
      const migrationSQL = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      await client.query('BEGIN');
      
      try {
        await client.query(migrationSQL);
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [migrationName]);
        await client.query('COMMIT');
        
        console.log(`✅ Migración ${migrationName} ejecutada exitosamente`);
        executedCount++;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Error ejecutando migración ${migrationName}:`, error.message);
        // Continuar con la siguiente migración en lugar de fallar
        console.log(`⚠️  Continuando con la siguiente migración...`);
        continue;
      }
    }
    
    if (executedCount > 0) {
      console.log(`🎉 Se ejecutaron ${executedCount} migraciones`);
    } else {
      console.log('✅ Todas las migraciones están al día');
    }
    
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Función para verificar la conexión
async function checkConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ Conexión a la base de datos establecida');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error.message);
    return false;
  }
}

// Función principal
async function main() {
  console.log('🚀 Iniciando proceso de migración...');
  
  // Esperar a que la base de datos esté disponible
  let retries = 0;
  const maxRetries = 30;
  
  while (retries < maxRetries) {
    if (await checkConnection()) {
      break;
    }
    
    retries++;
    console.log(`⏳ Esperando conexión a la base de datos... (${retries}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  if (retries >= maxRetries) {
    console.error('❌ No se pudo conectar a la base de datos después de 60 segundos');
    process.exit(1);
  }
  
  try {
    await runMigrations();
    console.log('✅ Proceso de migración completado');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en el proceso de migración:', error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { runMigrations, checkConnection };
