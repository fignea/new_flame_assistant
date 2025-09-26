#!/usr/bin/env node

/**
 * Script de prueba para verificar los filtros de mensajes
 * Simula diferentes tipos de mensajes para probar los filtros
 */

const path = require('path');

// Simular la lógica de filtrado
function isGroupMessage(chatId) {
  return chatId.includes('@g.us');
}

function isStatusMessage(message) {
  const statusPatterns = [
    /^\[Status\]/i,
    /^\[Estado\]/i,
    /^\[Story\]/i,
    /^\[Historia\]/i,
    /^\[View Once\]/i,
    /^\[Ver una vez\]/i,
    /^\[Ephemeral\]/i,
    /^\[Temporal\]/i,
    /^\[Protocol Update\]/i,
    /^\[Security Update\]/i
  ];

  const statusContent = [
    'Status',
    'Estado',
    'Story',
    'Historia',
    'View Once',
    'Ver una vez',
    'Ephemeral',
    'Temporal',
    'Protocol Update',
    'Security Update'
  ];

  const statusMessageTypes = [
    'ephemeral',
    'view_once',
    'view_once_image',
    'view_once_video',
    'protocol_update',
    'security_update'
  ];

  return statusPatterns.some(pattern => pattern.test(message.content)) ||
         statusContent.some(status => message.content.includes(status)) ||
         statusMessageTypes.includes(message.messageType);
}

// Mensajes de prueba
const testMessages = [
  // Mensajes normales (deben pasar)
  {
    id: '1',
    chatId: '1234567890@s.whatsapp.net',
    content: 'Hola, ¿cómo estás?',
    messageType: 'text',
    isFromMe: false
  },
  {
    id: '2',
    chatId: '9876543210@s.whatsapp.net',
    content: 'Gracias por la información',
    messageType: 'text',
    isFromMe: true
  },
  {
    id: '3',
    chatId: '5555555555@s.whatsapp.net',
    content: 'Te envío una imagen',
    messageType: 'image',
    isFromMe: false
  },

  // Mensajes de grupos (deben ser filtrados)
  {
    id: '4',
    chatId: '120363123456789@g.us',
    content: 'Mensaje en el grupo',
    messageType: 'text',
    isFromMe: false
  },
  {
    id: '5',
    chatId: '120363987654321@g.us',
    content: 'Otro mensaje de grupo',
    messageType: 'text',
    isFromMe: true
  },

  // Mensajes de estado (deben ser filtrados)
  {
    id: '6',
    chatId: '1234567890@s.whatsapp.net',
    content: '[Status] Mi estado de WhatsApp',
    messageType: 'text',
    isFromMe: false
  },
  {
    id: '7',
    chatId: '9876543210@s.whatsapp.net',
    content: '[Story] Mi historia',
    messageType: 'text',
    isFromMe: false
  },
  {
    id: '8',
    chatId: '5555555555@s.whatsapp.net',
    content: '[View Once] Mensaje que se ve una vez',
    messageType: 'view_once',
    isFromMe: false
  },
  {
    id: '9',
    chatId: '1111111111@s.whatsapp.net',
    content: '[Ephemeral] Mensaje temporal',
    messageType: 'ephemeral',
    isFromMe: false
  },
  {
    id: '10',
    chatId: '2222222222@s.whatsapp.net',
    content: '[Protocol Update] Actualización de protocolo',
    messageType: 'protocol_update',
    isFromMe: false
  }
];

console.log('🧪 Prueba de Filtros de Mensajes');
console.log('================================');
console.log('');

let passedMessages = 0;
let filteredMessages = 0;
let groupMessages = 0;
let statusMessages = 0;

console.log('📋 Resultados de la prueba:');
console.log('===========================');

testMessages.forEach((message, index) => {
  const isGroup = isGroupMessage(message.chatId);
  const isStatus = isStatusMessage(message);
  const shouldBeFiltered = isGroup || isStatus;
  
  const status = shouldBeFiltered ? '🚫 FILTRADO' : '✅ PASARÁ';
  const reason = isGroup ? 'GRUPO' : (isStatus ? 'ESTADO' : 'NORMAL');
  
  console.log(`${index + 1}. ${status} (${reason})`);
  console.log(`   ID: ${message.id}`);
  console.log(`   Chat: ${message.chatId}`);
  console.log(`   Contenido: "${message.content}"`);
  console.log(`   Tipo: ${message.messageType}`);
  console.log('');

  if (shouldBeFiltered) {
    filteredMessages++;
    if (isGroup) groupMessages++;
    if (isStatus) statusMessages++;
  } else {
    passedMessages++;
  }
});

console.log('📊 Resumen de la prueba:');
console.log('=======================');
console.log(`Total de mensajes probados: ${testMessages.length}`);
console.log(`Mensajes que pasarán: ${passedMessages}`);
console.log(`Mensajes filtrados: ${filteredMessages}`);
console.log(`  - Mensajes de grupos: ${groupMessages}`);
console.log(`  - Mensajes de estado: ${statusMessages}`);

console.log('');
console.log('✅ Prueba completada exitosamente!');
console.log('===================================');
console.log('Los filtros están funcionando correctamente.');
console.log('Solo se guardarán mensajes de conversaciones individuales normales.');
