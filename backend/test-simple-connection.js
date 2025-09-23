const { whatsappSimpleService } = require('./dist/services/whatsapp-simple.service');

async function testSimpleConnection() {
  console.log('🧪 Prueba simple de conexión WhatsApp...\n');

  try {
    const userId = 'test-simple-123';
    
    // Crear sesión
    console.log('1️⃣ Creando sesión...');
    const result = await whatsappSimpleService.createSession(userId);
    console.log('✅ Sesión creada:', result.sessionId);

    // Configurar listeners
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

    // Esperar y monitorear
    console.log('\n2️⃣ Monitoreando conexión (30 segundos)...');
    console.log('   📱 Escanea el QR con tu WhatsApp\n');

    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const status = whatsappSimpleService.getConnectionStatus(userId);
      console.log(`   [${i + 1}s] Estado: ${status.isConnected ? 'Conectado' : 'Desconectado'} | Autenticado: ${status.isAuthenticated ? 'Sí' : 'No'} | Socket: ${status.hasSocket ? 'Sí' : 'No'}`);

      if (status.isConnected) {
        console.log('\n🎉 ¡CONEXIÓN EXITOSA!');
        console.log('   - Teléfono:', status.phoneNumber);
        console.log('   - Nombre:', status.userName);
        console.log('   - Socket conectado:', status.socketConnected);
        break;
      }

      // Mostrar QR cada 5 segundos
      if ((i + 1) % 5 === 0) {
        const qrCode = await whatsappSimpleService.getQRCode(userId);
        if (qrCode) {
          console.log(`   🔍 QR disponible (${qrCode.length} chars)`);
        }
      }
    }

    // Estado final
    const finalStatus = whatsappSimpleService.getConnectionStatus(userId);
    console.log('\n📊 Estado final:');
    console.log('   - Conectado:', finalStatus.isConnected);
    console.log('   - Autenticado:', finalStatus.isAuthenticated);
    console.log('   - Tiene socket:', finalStatus.hasSocket);
    console.log('   - Socket conectado:', finalStatus.socketConnected);
    console.log('   - Teléfono:', finalStatus.phoneNumber);
    console.log('   - Nombre:', finalStatus.userName);

    // Limpiar
    console.log('\n3️⃣ Limpiando...');
    await whatsappSimpleService.disconnectSession(userId);
    console.log('✅ Limpiado');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testSimpleConnection();
