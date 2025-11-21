#!/usr/bin/env node

/**
 * Script para monitorear la atribución de mensajes en tiempo real
 * Este script ayuda a identificar mensajes que pueden tener atribución incorrecta
 */

const path = require('path');

// Importar la configuración de base de datos existente
const { database } = require('../src/config/database');

console.log('🔍 Monitor de atribución de mensajes');
console.log('===================================');

// Función para obtener mensajes recientes
async function getRecentMessages(limit = 20) {
  try {
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
      LIMIT $1
    `;
    
    const result = await database.query(query, [limit]);
    return result.rows;
  } catch (error) {
    throw error;
  }
}

// Función para analizar patrones de mensajes
function analyzeMessagePatterns(messages) {
  const analysis = {
    total: messages.length,
    fromMe: messages.filter(m => m.is_from_me).length,
    fromOthers: messages.filter(m => !m.is_from_me).length,
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
    ) && !msg.is_from_me;

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
  console.log(`Enviados por mí: ${analysis.fromMe} (${((analysis.fromMe / analysis.total) * 100).toFixed(1)}%)`);
  console.log(`Enviados por otros: ${analysis.fromOthers} (${((analysis.fromOthers / analysis.total) * 100).toFixed(1)}%)`);
  
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
    const sender = msg.is_from_me ? 'Tú' : (msg.contact_name || msg.chat_id.split('@')[0]);
    const timestamp = new Date(msg.timestamp).toLocaleString();
    const status = msg.is_from_me ? '✅' : '👤';
    
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
      console.log('2. Si son mensajes tuyos, ejecuta el script de corrección:');
      console.log('   node scripts/fix-message-attribution.js');
      console.log('3. Verifica la configuración del servicio de WhatsApp');
    }

  } catch (error) {
    console.error('❌ Error ejecutando el monitor:', error);
  }
}

// Ejecutar el script
main();
