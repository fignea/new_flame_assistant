const { whatsappPersistentService } = require('./dist/services/whatsapp-persistent.service');

async function testSessionCreation() {
  console.log('🔍 Testing session creation directly...');
  
  try {
    const userId = '0bbd9788-127f-4cb5-b6c4-a4ae47e98126'; // UUID del usuario admin
    
    console.log('📱 Creating session for user:', userId);
    const result = await whatsappPersistentService.createSession(userId);
    console.log('✅ Session created:', result);
    
    // Esperar un poco para que se genere el QR
    console.log('⏳ Waiting 5 seconds for QR generation...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('🔍 Getting QR code...');
    const qrCode = await whatsappPersistentService.getQRCode(result.sessionId);
    console.log('QR Code available:', !!qrCode);
    if (qrCode) {
      console.log('QR Code length:', qrCode.length);
      console.log('QR Code preview:', qrCode.substring(0, 50) + '...');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  }
}

testSessionCreation();
