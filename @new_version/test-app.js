import axios from 'axios';

async function testWhatsAppManager() {
  console.log('🧪 Probando WhatsApp Manager MVP...\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Verificando health check...');
    const healthResponse = await axios.get('http://localhost:3001/health');
    console.log('✅ Backend funcionando:', healthResponse.data.status);

    // Test 2: Login con credenciales por defecto
    console.log('\n2️⃣ Probando login...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@whatsapp-manager.com',
      password: 'admin123'
    });
    
    if (loginResponse.data.success) {
      console.log('✅ Login exitoso');
      console.log('   Usuario:', loginResponse.data.data.user.name);
      console.log('   Email:', loginResponse.data.data.user.email);
      
      const token = loginResponse.data.data.token;
      const headers = { Authorization: `Bearer ${token}` };

      // Test 3: Crear sesión de WhatsApp
      console.log('\n3️⃣ Creando sesión de WhatsApp...');
      const sessionResponse = await axios.post(
        'http://localhost:3001/api/whatsapp/session',
        {},
        { headers }
      );
      
      if (sessionResponse.data.success) {
        console.log('✅ Sesión creada:', sessionResponse.data.data.sessionId);

        // Test 4: Obtener estado
        console.log('\n4️⃣ Obteniendo estado de WhatsApp...');
        const statusResponse = await axios.get(
          'http://localhost:3001/api/whatsapp/status',
          { headers }
        );
        
        console.log('✅ Estado obtenido:');
        console.log('   Conectado:', statusResponse.data.data.isConnected);
        console.log('   Autenticado:', statusResponse.data.data.isAuthenticated);

        // Test 5: Intentar obtener QR
        console.log('\n5️⃣ Intentando obtener código QR...');
        try {
          const qrResponse = await axios.get(
            'http://localhost:3001/api/whatsapp/qr',
            { headers }
          );
          
          if (qrResponse.data.success) {
            console.log('✅ QR Code disponible:', !!qrResponse.data.data.qrCode);
          }
        } catch (qrError) {
          console.log('ℹ️ QR no disponible aún (normal en este punto)');
        }

        // Test 6: Obtener estadísticas
        console.log('\n6️⃣ Obteniendo estadísticas...');
        const statsResponse = await axios.get(
          'http://localhost:3001/api/whatsapp/stats',
          { headers }
        );
        
        console.log('✅ Estadísticas:');
        console.log('   Contactos:', statsResponse.data.data.contacts);
        console.log('   Mensajes:', statsResponse.data.data.messages);
        console.log('   Programados:', statsResponse.data.data.scheduledMessages);

      } else {
        console.log('❌ Error creando sesión:', sessionResponse.data.message);
      }

    } else {
      console.log('❌ Error en login:', loginResponse.data.message);
    }

    console.log('\n🎉 Pruebas completadas!');
    console.log('\n📍 Accesos:');
    console.log('   🌐 Frontend: http://localhost:5173');
    console.log('   🔧 Backend: http://localhost:3001');
    console.log('   🏥 Health: http://localhost:3001/health');
    console.log('\n🔑 Credenciales:');
    console.log('   📧 Email: admin@whatsapp-manager.com');
    console.log('   🔒 Password: admin123');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error.response?.data || error.message);
  }
}

// Esperar un poco para que los servicios se inicien
setTimeout(testWhatsAppManager, 5000);
