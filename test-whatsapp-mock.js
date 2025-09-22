const QRCode = require('qrcode');

async function testQRGeneration() {
  console.log('🔍 Testing QR Code generation...');
  
  try {
    // Generar un QR code de prueba
    const testData = 'whatsapp-web-test-' + Date.now();
    const qrCodeDataURL = await QRCode.toDataURL(testData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    console.log('✅ QR Code generated successfully');
    console.log('QR Code type:', typeof qrCodeDataURL);
    console.log('QR Code length:', qrCodeDataURL.length);
    console.log('QR Code preview:', qrCodeDataURL.substring(0, 50) + '...');
    
    // Simular el flujo de WhatsApp Web
    console.log('🔄 Simulating WhatsApp Web flow...');
    
    // Simular eventos
    setTimeout(() => {
      console.log('📱 QR Code would be displayed to user');
    }, 1000);
    
    setTimeout(() => {
      console.log('👤 User would scan QR code with phone');
    }, 2000);
    
    setTimeout(() => {
      console.log('✅ WhatsApp Web would be connected');
    }, 3000);
    
  } catch (error) {
    console.error('❌ Error generating QR code:', error);
  }
}

testQRGeneration();
