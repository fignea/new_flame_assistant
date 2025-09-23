const { whatsappSimpleService } = require('./dist/services/whatsapp-simple.service');

async function testSimpleWhatsAppService() {
  console.log('🧪 Probando SimpleWhatsAppService...\n');

  try {
    // Test 1: Crear sesión
    console.log('1️⃣ Creando sesión de prueba...');
    const userId = 'test-user-123';
    const result = await whatsappSimpleService.createSession(userId);
    console.log('✅ Sesión creada:', result);

    // Test 2: Obtener estado de conexión
    console.log('\n2️⃣ Obteniendo estado de conexión...');
    const status = whatsappSimpleService.getConnectionStatus(userId);
    console.log('✅ Estado:', status);

    // Test 3: Obtener estadísticas
    console.log('\n3️⃣ Obteniendo estadísticas...');
    const stats = whatsappSimpleService.getSessionStats();
    console.log('✅ Estadísticas:', stats);

    // Test 4: Esperar un poco para ver si se genera QR
    console.log('\n4️⃣ Esperando generación de QR (10 segundos)...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Test 5: Intentar obtener QR
    console.log('\n5️⃣ Obteniendo QR code...');
    const qrCode = await whatsappSimpleService.getQRCode(userId);
    const qrDataURL = await whatsappSimpleService.getQRCodeDataURL(userId);
    console.log('✅ QR Code disponible:', !!qrCode);
    console.log('✅ QR Data URL disponible:', !!qrDataURL);

    // Test 6: Obtener QR del cache
    console.log('\n6️⃣ Obteniendo QR del cache...');
    const qrFromCache = whatsappSimpleService.getQRCodeFromCache(userId);
    console.log('✅ QR del cache:', qrFromCache ? 'Disponible' : 'No disponible');

    // Test 7: Limpiar sesión
    console.log('\n7️⃣ Limpiando sesión...');
    await whatsappSimpleService.disconnectSession(userId);
    console.log('✅ Sesión limpiada');

    console.log('\n🎉 Todas las pruebas completadas exitosamente!');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
  }
}

// Ejecutar pruebas
testSimpleWhatsAppService();
