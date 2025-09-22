const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

async function testWhatsAppClient() {
  console.log('🔍 Testing WhatsApp Web client initialization...');
  
  try {
    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'test-session',
        dataPath: './test-sessions'
      }),
      puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      }
    });

    client.on('qr', async (qr) => {
      console.log('✅ QR Code received!');
      try {
        const qrCodeDataURL = await QRCode.toDataURL(qr, {
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
      } catch (error) {
        console.error('❌ Error generating QR code:', error);
      }
    });

    client.on('ready', () => {
      console.log('✅ WhatsApp client is ready!');
    });

    client.on('authenticated', () => {
      console.log('✅ WhatsApp client authenticated!');
    });

    client.on('auth_failure', (msg) => {
      console.error('❌ WhatsApp authentication failed:', msg);
    });

    client.on('disconnected', (reason) => {
      console.log('⚠️ WhatsApp client disconnected:', reason);
    });

    console.log('🚀 Initializing WhatsApp client...');
    await client.initialize();
    console.log('✅ WhatsApp client initialized successfully');

  } catch (error) {
    console.error('❌ Error testing WhatsApp client:', error);
  }
}

testWhatsAppClient();
