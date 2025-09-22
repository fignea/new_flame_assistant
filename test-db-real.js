const { WhatsAppSessionModel } = require('./dist/models/whatsapp-session.model');

async function testDatabase() {
  console.log('🔍 Testing WhatsApp Session Model with real UUID...');
  
  try {
    console.log('📱 Creating session in database...');
    const sessionData = {
      userId: '442cf333-e9ec-4211-a57f-15ffd530c80e', // UUID real del usuario admin
      sessionId: 'test-session-123',
      qrCode: undefined,
      isConnected: false,
      isAuthenticated: false,
      phoneNumber: undefined,
      userName: undefined,
      lastSeen: undefined,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };
    
    console.log('Session data:', sessionData);
    
    const result = await WhatsAppSessionModel.create(sessionData);
    console.log('✅ Session created successfully:', result);
    
  } catch (error) {
    console.error('❌ Error creating session:', error);
    console.error('Error stack:', error.stack);
  }
}

testDatabase();
