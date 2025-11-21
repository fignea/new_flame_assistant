#!/usr/bin/env node

/**
 * Script simplificado para monitorear la atribución de mensajes
 * Usa sqlite3 directamente sin dependencias de TypeScript
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuración de la base de datos
const dbPath = path.join(__dirname, '../data/whatsapp_manager.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Monitor de atribución de mensajes (Versión Simple)');
console.log('==================================================');

// Función para obtener mensajes recientes
function getRecentMessages(limit = 20) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        m.id,
        m.whatsapp_message_id,
        m.chat_id,
        m.content,
        m.is_from_me,
        m.timestamp,
        c.name as contact_name,
        c.whatsapp_id
      FROM messages m
      LEFT JOIN contacts c ON c.whatsapp_id = m.chat_id AND c.user_id = m.user_id
      ORDER BY m.timestamp DESC
      LIMIT ?
    `;
    
    db.all(query, [limit], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Función para obtener estadísticas
function getMessageStats() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        COUNT(*) as total_messages,
        SUM(CASE WHEN is_from_me = 1 THEN 1 ELSE 0 END) as from_me,
        SUM(CASE WHEN is_from_me = 0 THEN 1 ELSE 0 END) as from_others
      FROM messages
    `;
    
    db.get(query, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Función para analizar patrones de mensajes
function analyzeMessagePatterns(messages) {
  const analysis = {
    total: messages.length,
    fromMe: messages.filter(m => m.is_from_me === 1).length,
    fromOthers: messages.filter(m => m.is_from_me === 0).length,
    suspiciousMessages: []
  };

  // Identificar mensajes sospechosos
  messages.forEach(msg => {
    // Mensajes que parecen ser del usuario pero están marcados como de otros
    const userLikePatterns = [
      /^(Si|Sí|Ok|Oka|Vale|Bien)$/i,
      /^(Hagamos|Vamos|Vaaamoooooo)$/i,
      /^(El teclado|Pero el resto|Ahora si)$/i,
      /^(Pero voy|Porque me|Hice.*viajes)$/i,
      /^(Belu|separó|toallas)$/i
    ];

    const isSuspicious = userLikePatterns.some(pattern => 
      pattern.test(msg.content.trim())
    ) && msg.is_from_me === 0;

    if (isSuspicious) {
      analysis.suspiciousMessages.push(msg);
    }
  });

  return analysis;
}

// Función para mostrar estadísticas
function displayStats(analysis) {
  console.log('\n📊 Estadísticas de mensajes:');
  console.log(`Total de mensajes: ${analysis.total}`);
  console.log(`Enviados por mí: ${analysis.fromMe} (${analysis.total > 0 ? ((analysis.fromMe / analysis.total) * 100).toFixed(1) : 0}%)`);
  console.log(`Enviados por otros: ${analysis.fromOthers} (${analysis.total > 0 ? ((analysis.fromOthers / analysis.total) * 100).toFixed(1) : 0}%)`);
  
  if (analysis.suspiciousMessages.length > 0) {
    console.log(`\n⚠️  Mensajes sospechosos: ${analysis.suspiciousMessages.length}`);
    analysis.suspiciousMessages.forEach((msg, index) => {
      console.log(`   ${index + 1}. "${msg.content}" (${msg.timestamp})`);
    });
  } else {
    console.log('\n✅ No se encontraron mensajes sospechosos');
  }
}

// Función para mostrar mensajes recientes
function displayRecentMessages(messages) {
  console.log('\n💬 Mensajes recientes:');
  console.log('====================');
  
  messages.slice(0, 10).forEach((msg, index) => {
    const sender = msg.is_from_me === 1 ? 'Tú' : (msg.contact_name || msg.chat_id.split('@')[0]);
    const timestamp = new Date(msg.timestamp).toLocaleString();
    const status = msg.is_from_me === 1 ? '✅' : '👤';
    
    console.log(`${index + 1}. ${status} ${sender}: "${msg.content}"`);
    console.log(`   📅 ${timestamp} | 💬 ${msg.chat_id}`);
    console.log('');
  });
}

// Función principal
async function main() {
  try {
    console.log('🔍 Analizando mensajes recientes...\n');
    
    const messages = await getRecentMessages(50);
    
    if (messages.length === 0) {
      console.log('📭 No hay mensajes en la base de datos.');
      return;
    }

    const analysis = analyzeMessagePatterns(messages);
    displayStats(analysis);
    displayRecentMessages(messages);

    // Sugerencias
    if (analysis.suspiciousMessages.length > 0) {
      console.log('\n💡 Sugerencias:');
      console.log('1. Revisa los mensajes sospechosos listados arriba');
      console.log('2. Si son mensajes tuyos, puedes corregirlos manualmente en la base de datos:');
      console.log('   sqlite3 data/whatsapp_manager.db');
      console.log('   UPDATE messages SET is_from_me = 1 WHERE id = [ID_DEL_MENSAJE];');
      console.log('3. Verifica la configuración del servicio de WhatsApp');
    }

  } catch (error) {
    console.error('❌ Error ejecutando el monitor:', error);
  } finally {
    db.close();
  }
}

// Ejecutar el script
main();

