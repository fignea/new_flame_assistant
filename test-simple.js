// Test simple para verificar que el QR se genera correctamente
const QRCode = require('qrcode');

async function testQR() {
  try {
    const qr = await QRCode.toDataURL('whatsapp-web-test', {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    console.log('QR generado:', qr.substring(0, 100) + '...');
  } catch (error) {
    console.error('Error:', error);
  }
}

testQR();
