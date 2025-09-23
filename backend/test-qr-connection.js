const { whatsappSimpleService } = require('./dist/services/whatsapp-simple.service');

async function testQRConnection() {
  console.log('🧪 Probando conexión completa con QR...\n');

  try {
    const userId = 'test-user-qr-123';
    
    // Test 1: Crear sesión
    console.log('1️⃣ Creando sesión...');
    const result = await whatsappSimpleService.createSession(userId);
    console.log('✅ Sesión creada:', result.sessionId);

    // Test 2: Configurar listeners de eventos
    console.log('\n2️⃣ Configurando listeners de eventos...');
    
    whatsappSimpleService.on('qr', (userId, qr, qrDataURL) => {
      console.log('🔍 QR Code recibido!');
      console.log('   - Usuario:', userId);
      console.log('   - QR Length:', qr.length);
      console.log('   - Data URL disponible:', !!qrDataURL);
    });

    whatsappSimpleService.on('connected', (userId) => {
      console.log('🎉 ¡CONECTADO! Usuario:', userId);
    });

    whatsappSimpleService.on('authenticated', (userId) => {
      console.log('🔐 ¡AUTENTICADO! Usuario:', userId);
    });

    whatsappSimpleService.on('disconnected', (userId) => {
      console.log('❌ Desconectado. Usuario:', userId);
    });

    // Test 3: Esperar y monitorear conexión
    console.log('\n3️⃣ Monitoreando conexión (60 segundos)...');
    console.log('   📱 Escanea el QR con tu WhatsApp');
    console.log('   ⏰ Esperando conexión...\n');

    let connected = false;
    let attempts = 0;
    const maxAttempts = 60; // 60 segundos

    while (!connected && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;

      const status = whatsappSimpleService.getConnectionStatus(userId);
      console.log(`   [${attempts}s] Estado: ${status.isConnected ? 'Conectado' : 'Desconectado'} | Autenticado: ${status.isAuthenticated ? 'Sí' : 'No'}`);

      if (status.isConnected) {
        connected = true;
        console.log('\n🎉 ¡CONEXIÓN EXITOSA!');
        console.log('   - Teléfono:', status.phoneNumber);
        console.log('   - Nombre:', status.userName);
        console.log('   - Última conexión:', status.lastSeen);
        break;
      }

      // Mostrar QR cada 10 segundos si no está conectado
      if (attempts % 10 === 0) {
        const qrCode = await whatsappSimpleService.getQRCode(userId);
        if (qrCode) {
          console.log(`   🔍 QR disponible (${qrCode.length} chars) - Escanea con WhatsApp`);
        } else {
          console.log('   ⏳ Generando QR...');
        }
      }
    }

    if (!connected) {
      console.log('\n⏰ Tiempo agotado. Intentando reconexión...');
      
      // Test 4: Forzar reconexión
      console.log('\n4️⃣ Forzando reconexión...');
      const reconnected = await whatsappSimpleService.forceReconnect(userId);
      console.log('✅ Reconexión iniciada:', reconnected);
      
      // Esperar un poco más
      console.log('\n5️⃣ Esperando reconexión (30 segundos)...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      const finalStatus = whatsappSimpleService.getConnectionStatus(userId);
      console.log('   Estado final:', finalStatus);
    }

    // Test 5: Obtener estadísticas finales
    console.log('\n6️⃣ Estadísticas finales:');
    const stats = whatsappSimpleService.getSessionStats();
    console.log('   - Sesiones activas:', stats.activeSessions);
    console.log('   - Sesiones conectadas:', stats.connectedSessions);
    console.log('   - Chats totales:', stats.totalChats);
    console.log('   - Mensajes totales:', stats.totalMessages);
    console.log('   - QR en cache:', stats.qrCodesInCache);

    // Test 6: Limpiar
    console.log('\n7️⃣ Limpiando sesión...');
    await whatsappSimpleService.disconnectSession(userId);
    console.log('✅ Sesión limpiada');

    console.log('\n🎉 Prueba completada!');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  }
}

// Ejecutar prueba
testQRConnection();
