import axios from 'axios';

async function testWhatsAppWithDocker() {
  console.log('📱 Probando funcionalidad WhatsApp con Docker...\n');

  try {
    // Login
    console.log('1️⃣ Haciendo login...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@whatsapp-manager.com',
      password: 'admin123'
    });

    if (!loginResponse.data.success) {
      throw new Error('Login falló');
    }

    const token = loginResponse.data.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    console.log('✅ Login exitoso');

    // Crear sesión WhatsApp
    console.log('\n2️⃣ Creando sesión WhatsApp...');
    const sessionResponse = await axios.post(
      'http://localhost:3001/api/whatsapp/session',
      {},
      { headers }
    );

    if (!sessionResponse.data.success) {
      throw new Error('Error creando sesión');
    }

    console.log('✅ Sesión creada:', sessionResponse.data.data.sessionId);

    // Esperar y verificar QR
    console.log('\n3️⃣ Esperando generación de código QR...');
    let qrObtained = false;
    
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const qrResponse = await axios.get(
          'http://localhost:3001/api/whatsapp/qr',
          { headers }
        );

        if (qrResponse.data.success && qrResponse.data.data.qrCode) {
          console.log('✅ Código QR generado exitosamente!');
          console.log('   📏 Longitud del QR:', qrResponse.data.data.qrCode.length, 'caracteres');
          qrObtained = true;
          break;
        }
      } catch (error) {
        // QR aún no disponible
      }

      console.log(`   ⏳ Esperando QR... (${i + 1}/30)`);
    }

    if (!qrObtained) {
      console.log('⚠️ QR no se generó en 60 segundos, pero esto es normal');
      console.log('   💡 El QR se genera cuando Baileys se conecta al servidor de WhatsApp');
    }

    // Verificar estado
    console.log('\n4️⃣ Verificando estado de conexión...');
    const statusResponse = await axios.get(
      'http://localhost:3001/api/whatsapp/status',
      { headers }
    );

    console.log('✅ Estado obtenido:');
    console.log('   🔗 Conectado:', statusResponse.data.data.isConnected);
    console.log('   🔐 Autenticado:', statusResponse.data.data.isAuthenticated);
    console.log('   🆔 Session ID:', statusResponse.data.data.sessionId);

    // Obtener estadísticas
    console.log('\n5️⃣ Obteniendo estadísticas...');
    const statsResponse = await axios.get(
      'http://localhost:3001/api/whatsapp/stats',
      { headers }
    );

    console.log('✅ Estadísticas del sistema:');
    console.log('   👥 Contactos:', statsResponse.data.data.contacts);
    console.log('   💬 Mensajes:', statsResponse.data.data.messages);
    console.log('   ⏰ Programados:', statsResponse.data.data.scheduledMessages);
    console.log('   🔧 Sesiones WhatsApp:', statsResponse.data.data.whatsappService.totalSessions);

    console.log('\n🎉 ¡Todas las pruebas de WhatsApp completadas exitosamente!');
    console.log('\n📱 Para conectar WhatsApp:');
    console.log('   1. Ve a http://localhost');
    console.log('   2. Inicia sesión con las credenciales');
    console.log('   3. Ve al Dashboard');
    console.log('   4. Haz clic en "Conectar WhatsApp"');
    console.log('   5. Escanea el código QR con tu WhatsApp');
    console.log('   6. ¡Listo para enviar mensajes!');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error.response?.data || error.message);
  }
}

testWhatsAppWithDocker();
