const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'whatsapp_manager',
  user: 'whatsapp_user',
  password: 'whatsapp_password'
});

// Función para generar ID único alfanumérico
function generateConversationId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function migratePublicIds() {
  try {
    console.log('Iniciando migración de public_id...');
    
    // Obtener conversaciones sin public_id
    const result = await pool.query(
      'SELECT id FROM web_conversations WHERE public_id IS NULL'
    );
    
    console.log(`Encontradas ${result.rows.length} conversaciones sin public_id`);
    
    for (const row of result.rows) {
      let publicId = generateConversationId();
      let isUnique = false;
      let attempts = 0;
      
      // Verificar que el ID sea único
      while (!isUnique && attempts < 10) {
        const checkResult = await pool.query(
          'SELECT id FROM web_conversations WHERE public_id = $1',
          [publicId]
        );
        if (checkResult.rows.length === 0) {
          isUnique = true;
        } else {
          publicId = generateConversationId();
          attempts++;
        }
      }
      
      if (isUnique) {
        await pool.query(
          'UPDATE web_conversations SET public_id = $1 WHERE id = $2',
          [publicId, row.id]
        );
        console.log(`Actualizada conversación ${row.id} con public_id: ${publicId}`);
      } else {
        console.error(`No se pudo generar ID único para conversación ${row.id}`);
      }
    }
    
    console.log('Migración completada exitosamente');
    
  } catch (error) {
    console.error('Error en la migración:', error);
  } finally {
    await pool.end();
  }
}

migratePublicIds();
