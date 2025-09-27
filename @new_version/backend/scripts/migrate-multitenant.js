const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración de la base de datos
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'whatsapp_manager',
  user: process.env.DB_USER || 'whatsapp_user',
  password: process.env.DB_PASSWORD || 'whatsapp_password',
});

async function migrateToMultiTenant() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando migración a sistema multi-tenant...');
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'multitenant-schema.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Dividir el SQL en statements individuales, manejando bloques DO $$
    const statements = [];
    const lines = sqlContent.split('\n');
    let currentStatement = '';
    let inDoBlock = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Saltar comentarios y líneas vacías
      if (trimmedLine.startsWith('--') || trimmedLine === '') {
        continue;
      }
      
      // Detectar inicio de bloque DO $$
      if (trimmedLine.startsWith('DO $$')) {
        inDoBlock = true;
        currentStatement = trimmedLine;
        continue;
      }
      
      // Detectar fin de bloque DO $$
      if (inDoBlock && trimmedLine === '$$;') {
        currentStatement += '\n' + trimmedLine;
        statements.push(currentStatement);
        currentStatement = '';
        inDoBlock = false;
        continue;
      }
      
      // Si estamos en un bloque DO, agregar a la declaración actual
      if (inDoBlock) {
        currentStatement += '\n' + line;
        continue;
      }
      
      // Para statements normales
      if (trimmedLine.endsWith(';')) {
        currentStatement += (currentStatement ? '\n' : '') + line;
        statements.push(currentStatement);
        currentStatement = '';
      } else {
        currentStatement += (currentStatement ? '\n' : '') + line;
      }
    }
    
    // Agregar cualquier statement restante
    if (currentStatement.trim()) {
      statements.push(currentStatement);
    }
    
    console.log(`📝 Ejecutando ${statements.length} statements SQL...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`   ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
          await client.query(statement);
        } catch (error) {
          // Algunos statements pueden fallar si ya existen (CREATE TABLE IF NOT EXISTS)
          if (error.message.includes('already exists') || error.message.includes('duplicate key')) {
            console.log(`   ⚠️  Statement ${i + 1} ya existe, continuando...`);
          } else {
            console.error(`   ❌ Error en statement ${i + 1}:`, error.message);
            throw error;
          }
        }
      }
    }
    
    console.log('✅ Migración completada exitosamente');
    
    // Verificar que las tablas se crearon correctamente
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('organizations', 'organization_roles')
    `);
    
    console.log('📊 Tablas creadas:', tables.rows.map(r => r.table_name));
    
    // Verificar datos de migración
    const orgCount = await client.query('SELECT COUNT(*) as count FROM organizations');
    const userRolesCount = await client.query('SELECT COUNT(*) as count FROM organization_roles');
    
    console.log(`📈 Organizaciones: ${orgCount.rows[0].count}`);
    console.log(`👥 Roles de usuario: ${userRolesCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
  migrateToMultiTenant()
    .then(() => {
      console.log('🎉 Migración finalizada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { migrateToMultiTenant };
