const { WhatsAppSessionModel } = require('./dist/models/whatsapp-session.model');

async function testDatabase() {
  console.log('🔍 Testing WhatsApp Session Model...');
  
  try {
    console.log('📱 Creating session in database...');
    const sessionData = {
      userId: 'test-user-123',
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
