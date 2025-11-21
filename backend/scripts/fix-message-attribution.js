#!/usr/bin/env node

/**
 * Script para corregir la atribución incorrecta de mensajes
 * Este script identifica y corrige mensajes que fueron marcados incorrectamente como enviados por otros usuarios
 */

const path = require('path');

// Importar la configuración de base de datos existente
const { database } = require('../src/config/database');

console.log('🔧 Script de corrección de atribución de mensajes');
console.log('================================================');

// Función para obtener mensajes problemáticos
async function getProblematicMessages() {
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
      WHERE m.is_from_me = FALSE 
        AND m.content IN (
          'Vaaaamoooooo',
          'El teclado esta re de virgo', 
          'Pero el resto bien',
          'Ahora si',
          'Pero voy s laburar acostado',
          'Porque me pesas los huevos mal',
          'Hice 3 viajes al pedo hoy jajaja',
          'Belu separó tus toallas'
        )
      ORDER BY m.timestamp DESC
    `;
    
    const result = await database.query(query, []);
    return result.rows;
  } catch (error) {
    throw error;
  }
}

// Función para corregir la atribución de un mensaje
async function fixMessageAttribution(messageId) {
  try {
    const query = `
      UPDATE messages 
      SET is_from_me = TRUE 
      WHERE id = $1
    `;
    
    const result = await database.run(query, [messageId]);
    return result.changes;
  } catch (error) {
    throw error;
  }
}

// Función para obtener estadísticas de mensajes
async function getMessageStats() {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_messages,
        SUM(CASE WHEN is_from_me = TRUE THEN 1 ELSE 0 END) as from_me,
        SUM(CASE WHEN is_from_me = FALSE THEN 1 ELSE 0 END) as from_others
      FROM messages
    `;
    
    const result = await database.get(query, []);
    return result;
  } catch (error) {
    throw error;
  }
}

// Función principal
async function main() {
  try {
    console.log('📊 Obteniendo estadísticas de mensajes...');
    const stats = await getMessageStats();
    console.log(`Total de mensajes: ${stats.total_messages}`);
    console.log(`Enviados por mí: ${stats.from_me}`);
    console.log(`Enviados por otros: ${stats.from_others}`);
    console.log('');

    console.log('🔍 Buscando mensajes problemáticos...');
    const problematicMessages = await getProblematicMessages();
    
    if (problematicMessages.length === 0) {
      console.log('✅ No se encontraron mensajes problemáticos.');
      return;
    }

    console.log(`❌ Se encontraron ${problematicMessages.length} mensajes problemáticos:`);
    console.log('');
    
    problematicMessages.forEach((msg, index) => {
      console.log(`${index + 1}. ID: ${msg.id}`);
      console.log(`   Contenido: "${msg.content}"`);
      console.log(`   Chat: ${msg.chat_id}`);
      console.log(`   Timestamp: ${msg.timestamp}`);
      console.log(`   Actualmente marcado como: ${msg.is_from_me ? 'Enviado por mí' : 'Enviado por otros'}`);
      console.log('');
    });

    console.log('🔧 Corrigiendo atribución de mensajes...');
    
    for (const msg of problematicMessages) {
      try {
        const changes = await fixMessageAttribution(msg.id);
        console.log(`✅ Corregido mensaje ID ${msg.id}: "${msg.content}"`);
      } catch (error) {
        console.error(`❌ Error corrigiendo mensaje ID ${msg.id}:`, error.message);
      }
    }

    console.log('');
    console.log('📊 Estadísticas después de la corrección:');
    const finalStats = await getMessageStats();
    console.log(`Total de mensajes: ${finalStats.total_messages}`);
    console.log(`Enviados por mí: ${finalStats.from_me}`);
    console.log(`Enviados por otros: ${finalStats.from_others}`);

  } catch (error) {
    console.error('❌ Error ejecutando el script:', error);
  }
}

// Ejecutar el script
main();
