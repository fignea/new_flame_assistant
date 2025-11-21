const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'whatsapp_manager',
  user: process.env.DB_USER || 'whatsapp_user',
  password: process.env.DB_PASSWORD || 'whatsapp_password'
});

// Función para generar hash determinístico
function generateDeterministicHash(input, length = 44) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  // Crear hash SHA-256 del input
  const hash = crypto.createHash('sha256').update(input).digest();
  
  // Convertir hash a caracteres alfanuméricos
  for (let i = 0; i < length; i++) {
    result += chars[hash[i % hash.length] % chars.length];
  }
  
  return result;
}

async function migrateChatHashes() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando migración de chat hashes...');
    
    // 1. Migrar contactos
    console.log('📞 Migrando contactos...');
    const contactsResult = await client.query(`
      SELECT id, whatsapp_id, user_id 
      FROM contacts 
      WHERE chat_hash IS NULL
    `);
    
    console.log(`   Encontrados ${contactsResult.rows.length} contactos sin chat_hash`);
    
    for (const contact of contactsResult.rows) {
      const chatHash = generateDeterministicHash(`${contact.whatsapp_id}_${contact.user_id}`, 44);
      
      await client.query(
        'UPDATE contacts SET chat_hash = $1 WHERE id = $2',
        [chatHash, contact.id]
      );
      
      console.log(`   ✅ Contacto ${contact.id}: ${contact.whatsapp_id} -> ${chatHash}`);
    }
    
    // 2. Migrar mensajes
    console.log('💬 Migrando mensajes...');
    const messagesResult = await client.query(`
      SELECT m.id, m.chat_id, m.user_id, c.chat_hash
      FROM messages m
      LEFT JOIN contacts c ON c.whatsapp_id = m.chat_id AND c.user_id = m.user_id
      WHERE m.chat_hash IS NULL
    `);
    
    console.log(`   Encontrados ${messagesResult.rows.length} mensajes sin chat_hash`);
    
    for (const message of messagesResult.rows) {
      let chatHash = message.chat_hash;
      
      // Si no hay chat_hash del contacto, generar uno
      if (!chatHash) {
        chatHash = generateDeterministicHash(`${message.chat_id}_${message.user_id}`, 44);
      }
      
      await client.query(
        'UPDATE messages SET chat_hash = $1 WHERE id = $2',
        [chatHash, message.id]
      );
      
      console.log(`   ✅ Mensaje ${message.id}: ${message.chat_id} -> ${chatHash}`);
    }
    
    // 3. Verificar migración
    console.log('🔍 Verificando migración...');
    
    const contactsWithoutHash = await client.query(
      'SELECT COUNT(*) as count FROM contacts WHERE chat_hash IS NULL'
    );
    
    const messagesWithoutHash = await client.query(
      'SELECT COUNT(*) as count FROM messages WHERE chat_hash IS NULL'
    );
    
    console.log(`   Contactos sin chat_hash: ${contactsWithoutHash.rows[0].count}`);
    console.log(`   Mensajes sin chat_hash: ${messagesWithoutHash.rows[0].count}`);
    
    if (contactsWithoutHash.rows[0].count === '0' && messagesWithoutHash.rows[0].count === '0') {
      console.log('✅ Migración completada exitosamente');
    } else {
      console.log('⚠️  Algunos registros no fueron migrados');
    }
    
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
  migrateChatHashes()
    .then(() => {
      console.log('🎉 Migración finalizada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { migrateChatHashes, generateDeterministicHash };
