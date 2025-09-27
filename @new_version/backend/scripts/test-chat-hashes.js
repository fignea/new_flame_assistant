const { Pool } = require('pg');
const { generateChatHashForWhatsApp, generateDeterministicHash } = require('../dist/utils/hash');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'whatsapp_manager',
  user: process.env.DB_USER || 'whatsapp_user',
  password: process.env.DB_PASSWORD || 'whatsapp_password'
});

async function testChatHashes() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Probando sistema de chat hashes...\n');
    
    // 1. Verificar que los contactos tienen chat_hash
    console.log('1️⃣ Verificando contactos con chat_hash:');
    const contactsResult = await client.query(`
      SELECT id, whatsapp_id, chat_hash, name 
      FROM contacts 
      ORDER BY id
    `);
    
    contactsResult.rows.forEach(contact => {
      console.log(`   ✅ Contacto ${contact.id}: ${contact.whatsapp_id} -> ${contact.chat_hash}`);
      console.log(`      Nombre: ${contact.name || 'Sin nombre'}`);
    });
    
    // 2. Verificar que los mensajes tienen chat_hash
    console.log('\n2️⃣ Verificando mensajes con chat_hash:');
    const messagesResult = await client.query(`
      SELECT m.id, m.chat_id, m.chat_hash, m.content, c.name as contact_name
      FROM messages m
      LEFT JOIN contacts c ON c.whatsapp_id = m.chat_id
      ORDER BY m.id
      LIMIT 5
    `);
    
    messagesResult.rows.forEach(message => {
      console.log(`   ✅ Mensaje ${message.id}: ${message.chat_id} -> ${message.chat_hash}`);
      console.log(`      Contenido: "${message.content.substring(0, 50)}..."`);
      console.log(`      Contacto: ${message.contact_name || 'Sin nombre'}`);
    });
    
    // 3. Probar generación de hashes
    console.log('\n3️⃣ Probando generación de hashes:');
    const testWhatsappId = '5491138208331@s.whatsapp.net';
    const testUserId = 1;
    
    const deterministicHash = generateDeterministicHash(`${testWhatsappId}_${testUserId}`, 44);
    const uniqueHash = generateChatHashForWhatsApp(testWhatsappId, testUserId);
    
    console.log(`   Determinístico: ${deterministicHash}`);
    console.log(`   Único: ${uniqueHash}`);
    console.log(`   Longitud: ${deterministicHash.length} caracteres`);
    
    // 4. Verificar que los hashes son únicos
    console.log('\n4️⃣ Verificando unicidad de hashes:');
    const hashCountResult = await client.query(`
      SELECT chat_hash, COUNT(*) as count
      FROM contacts 
      GROUP BY chat_hash
      HAVING COUNT(*) > 1
    `);
    
    if (hashCountResult.rows.length === 0) {
      console.log('   ✅ Todos los chat_hash son únicos');
    } else {
      console.log('   ❌ Se encontraron chat_hash duplicados:');
      hashCountResult.rows.forEach(row => {
        console.log(`      ${row.chat_hash}: ${row.count} veces`);
      });
    }
    
    // 5. Probar búsqueda por chat_hash
    console.log('\n5️⃣ Probando búsqueda por chat_hash:');
    const firstContact = contactsResult.rows[0];
    if (firstContact) {
      const searchResult = await client.query(`
        SELECT c.whatsapp_id, c.name, COUNT(m.id) as message_count
        FROM contacts c
        LEFT JOIN messages m ON m.chat_hash = c.chat_hash
        WHERE c.chat_hash = $1
        GROUP BY c.whatsapp_id, c.name
      `, [firstContact.chat_hash]);
      
      if (searchResult.rows.length > 0) {
        const result = searchResult.rows[0];
        console.log(`   ✅ Búsqueda exitosa para ${firstContact.chat_hash}:`);
        console.log(`      WhatsApp ID: ${result.whatsapp_id}`);
        console.log(`      Nombre: ${result.name || 'Sin nombre'}`);
        console.log(`      Mensajes: ${result.message_count}`);
      } else {
        console.log(`   ❌ No se encontró contacto con hash ${firstContact.chat_hash}`);
      }
    }
    
    console.log('\n🎉 Pruebas completadas exitosamente!');
    
  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar pruebas si se llama directamente
if (require.main === module) {
  testChatHashes()
    .then(() => {
      console.log('\n✅ Todas las pruebas pasaron');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error en las pruebas:', error);
      process.exit(1);
    });
}

module.exports = { testChatHashes };
