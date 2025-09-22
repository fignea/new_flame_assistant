const { whatsappPersistentService } = require('./dist/services/whatsapp-persistent.service');

async function testService() {
  console.log('🔍 Testing WhatsApp Persistent Service directly...');
  
  try {
    console.log('📱 Creating session...');
    const result = await whatsappPersistentService.createSession('test-user-123');
    console.log('Session created:', result);
    
    // Esperar un poco para que se genere el QR
    console.log('⏳ Waiting for QR generation...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('🔍 Getting QR code...');
    const qrCode = await whatsappPersistentService.getQRCode(result.sessionId);
    console.log('QR Code:', qrCode ? 'Generated' : 'Not available');
    
    console.log('📊 Getting status...');
    const status = await whatsappPersistentService.getConnectionStatus(result.sessionId);
    console.log('Status:', status);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testService();
